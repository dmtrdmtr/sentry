import React from 'react';
import {browserHistory} from 'react-router';

import {Client} from 'app/api';
import {mount} from 'enzyme';
import ConfigStore from 'app/stores/configStore';
import OrganizationMembers from 'app/views/settings/organizationMembers';
import OrganizationsStore from 'app/stores/organizationsStore';
import {addSuccessMessage, addErrorMessage} from 'app/actionCreators/indicator';

jest.mock('app/api');
jest.mock('app/actionCreators/indicator');

describe('OrganizationMembers', function() {
  let members = TestStubs.Members();
  let currentUser = members[1];
  let defaultProps = {
    orgId: 'org-slug',
    orgName: 'Organization Name',
    status: '',
    routes: [],
    requireLink: false,
    memberCanLeave: false,
    canAddMembers: false,
    canRemoveMembers: false,
    currentUser,
    onSendInvite: () => {},
    onRemove: () => {},
    onLeave: () => {},
  };
  let organization = TestStubs.Organization({
    access: ['member:admin', 'org:admin'],
    status: {
      id: 'active',
    },
  });
  let getStub;

  beforeAll(function() {
    getStub = sinon
      .stub(ConfigStore, 'get')
      .withArgs('user')
      .returns(currentUser);
  });

  afterAll(function() {
    getStub.restore();
  });

  beforeEach(function() {
    Client.clearMockResponses();
    Client.addMockResponse({
      url: '/organizations/org-id/members/',
      method: 'GET',
      body: TestStubs.Members(),
    });
    Client.addMockResponse({
      url: '/organizations/org-id/access-requests/',
      method: 'GET',
      body: [
        {
          id: 'pending-id',
          member: {
            id: 'pending-member-id',
            email: '',
            name: '',
            role: '',
            roleName: '',
            user: {
              id: '',
              name: 'sentry@test.com',
            },
          },
          team: TestStubs.Team(),
        },
      ],
    });
    Client.addMockResponse({
      url: '/organizations/org-id/auth-provider/',
      method: 'GET',
      body: {
        ...TestStubs.AuthProvider(),
        require_link: true,
      },
    });
    browserHistory.push.mockReset();
    OrganizationsStore.load([organization]);
  });

  it('can remove a member', async function() {
    let deleteMock = Client.addMockResponse({
      url: `/organizations/org-id/members/${members[0].id}/`,
      method: 'DELETE',
    });

    let wrapper = mount(
      <OrganizationMembers
        {...defaultProps}
        params={{
          orgId: 'org-id',
        }}
      />,
      TestStubs.routerContext([{organization}])
    );

    wrapper
      .find('Button[icon="icon-circle-subtract"]')
      .at(0)
      .simulate('click');

    await tick();

    // Confirm modal
    wrapper.find('ModalDialog Button[priority="primary"]').simulate('click');
    await tick();

    expect(deleteMock).toHaveBeenCalled();
    expect(addSuccessMessage).toHaveBeenCalled();

    expect(browserHistory.push).not.toHaveBeenCalled();
    expect(OrganizationsStore.getAll()).toEqual([organization]);
  });

  it('displays error message when failing to remove member', async function() {
    let deleteMock = Client.addMockResponse({
      url: `/organizations/org-id/members/${members[0].id}/`,
      method: 'DELETE',
      statusCode: 500,
    });

    let wrapper = mount(
      <OrganizationMembers
        {...defaultProps}
        params={{
          orgId: 'org-id',
        }}
      />,
      TestStubs.routerContext([{organization}])
    );

    wrapper
      .find('Button[icon="icon-circle-subtract"]')
      .at(0)
      .simulate('click');

    await tick();

    // Confirm modal
    wrapper.find('ModalDialog Button[priority="primary"]').simulate('click');
    await tick();
    expect(deleteMock).toHaveBeenCalled();
    await tick();
    expect(addErrorMessage).toHaveBeenCalled();

    expect(browserHistory.push).not.toHaveBeenCalled();
    expect(OrganizationsStore.getAll()).toEqual([organization]);
  });

  it('can leave org', async function() {
    let deleteMock = Client.addMockResponse({
      url: `/organizations/org-id/members/${members[1].id}/`,
      method: 'DELETE',
    });

    let wrapper = mount(
      <OrganizationMembers
        {...defaultProps}
        params={{
          orgId: 'org-id',
        }}
      />,
      TestStubs.routerContext([{organization}])
    );

    wrapper
      .find('Button[priority="danger"]')
      .at(0)
      .simulate('click');

    await tick();

    // Confirm modal
    wrapper.find('ModalDialog Button[priority="primary"]').simulate('click');
    await tick();

    expect(deleteMock).toHaveBeenCalled();
    expect(addSuccessMessage).toHaveBeenCalled();

    expect(browserHistory.push).toHaveBeenCalledTimes(1);
    expect(browserHistory.push).toHaveBeenCalledWith('/organizations/new/');
  });

  it('can redirect to remaining org after leaving', async function() {
    let deleteMock = Client.addMockResponse({
      url: `/organizations/org-id/members/${members[1].id}/`,
      method: 'DELETE',
    });
    let secondOrg = TestStubs.Organization({
      slug: 'org-two',
      status: {
        id: 'active',
      },
    });
    OrganizationsStore.add(secondOrg);

    let wrapper = mount(
      <OrganizationMembers
        {...defaultProps}
        params={{
          orgId: 'org-id',
        }}
      />,
      TestStubs.routerContext([{organization}])
    );

    wrapper
      .find('Button[priority="danger"]')
      .at(0)
      .simulate('click');

    await tick();

    // Confirm modal
    wrapper.find('ModalDialog Button[priority="primary"]').simulate('click');
    await tick();

    expect(deleteMock).toHaveBeenCalled();
    expect(addSuccessMessage).toHaveBeenCalled();

    expect(browserHistory.push).toHaveBeenCalledTimes(1);
    expect(browserHistory.push).toHaveBeenCalledWith(`/${secondOrg.slug}/`);
    expect(OrganizationsStore.getAll()).toEqual([secondOrg]);
  });

  it('displays error message when failing to leave org', async function() {
    let deleteMock = Client.addMockResponse({
      url: `/organizations/org-id/members/${members[1].id}/`,
      method: 'DELETE',
      statusCode: 500,
    });

    let wrapper = mount(
      <OrganizationMembers
        {...defaultProps}
        params={{
          orgId: 'org-id',
        }}
      />,
      TestStubs.routerContext([{organization}])
    );

    wrapper
      .find('Button[priority="danger"]')
      .at(0)
      .simulate('click');

    await tick();

    // Confirm modal
    wrapper.find('ModalDialog Button[priority="primary"]').simulate('click');
    await tick();
    expect(deleteMock).toHaveBeenCalled();
    await tick();
    expect(addErrorMessage).toHaveBeenCalled();

    expect(browserHistory.push).not.toHaveBeenCalled();
    expect(OrganizationsStore.getAll()).toEqual([organization]);
  });

  it('can re-send invite to member', async function() {
    let inviteMock = MockApiClient.addMockResponse({
      url: `/organizations/org-id/members/${members[0].id}/`,
      method: 'PUT',
      body: {
        id: '1234',
      },
    });
    let wrapper = mount(
      <OrganizationMembers
        {...defaultProps}
        params={{
          orgId: 'org-id',
        }}
      />,
      TestStubs.routerContext()
    );

    expect(inviteMock).not.toHaveBeenCalled();

    wrapper
      .find('ResendInviteButton')
      .first()
      .simulate('click');

    await tick();
    expect(inviteMock).toHaveBeenCalled();
  });

  it('can approve pending access request', async function() {
    let approveMock = MockApiClient.addMockResponse({
      url: '/organizations/org-id/access-requests/pending-id/',
      method: 'PUT',
    });
    let wrapper = mount(
      <OrganizationMembers
        {...defaultProps}
        params={{
          orgId: 'org-id',
        }}
      />,
      TestStubs.routerContext()
    );

    expect(approveMock).not.toHaveBeenCalled();

    wrapper
      .find('OrganizationAccessRequests Button[priority="primary"]')
      .simulate('click');

    await tick();

    expect(approveMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        data: {
          isApproved: true,
        },
      })
    );
  });

  it('can deny pending access request', async function() {
    let denyMock = MockApiClient.addMockResponse({
      url: '/organizations/org-id/access-requests/pending-id/',
      method: 'PUT',
    });
    let wrapper = mount(
      <OrganizationMembers
        {...defaultProps}
        params={{
          orgId: 'org-id',
        }}
      />,
      TestStubs.routerContext()
    );

    expect(denyMock).not.toHaveBeenCalled();

    wrapper
      .find('OrganizationAccessRequests Button')
      .at(1)
      .simulate('click');

    await tick();

    expect(denyMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        data: {
          isApproved: false,
        },
      })
    );
  });

  it('can search organization members', async function() {
    let searchMock = MockApiClient.addMockResponse({
      url: '/organizations/org-id/members/',
      body: [],
    });
    let routerContext = TestStubs.routerContext();
    let wrapper = mount(
      <OrganizationMembers
        {...defaultProps}
        location={{}}
        params={{
          orgId: 'org-id',
        }}
      />,
      routerContext
    );

    wrapper
      .find('AsyncComponentSearchInput input')
      .simulate('change', {target: {value: 'member'}});

    expect(searchMock).toHaveBeenLastCalledWith(
      '/organizations/org-id/members/',
      expect.objectContaining({
        method: 'GET',
        query: {
          query: 'member',
        },
      })
    );

    wrapper.find('PanelHeader form').simulate('submit');

    expect(routerContext.context.router.push).toHaveBeenCalledTimes(1);
  });
});
