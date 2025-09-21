import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  Button,
  BlockStack,
  Text,
  Banner,
  DataTable,
  Badge,
  InlineStack,
  EmptyState,
} from "@shopify/polaris";
import { useState } from "react";

import { authenticate } from "../shopify.server.js";
import { prisma } from "../shopify.server.js";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findFirst({
    where: { domain: session.shop }
  });

  if (!shop) {
    throw new Error("Shop not found");
  }

  // Get users for this shop (for now, we'll simulate this)
  // In a real implementation, you'd have a User model
  const users = [
    {
      id: "1",
      name: "Shop Owner",
      email: session.shop.replace('.myshopify.com', '@shopify.com'),
      role: "owner",
      status: "active",
      lastLogin: new Date(),
      permissions: ["all"]
    }
  ];

  return json({ 
    shop,
    users,
    currentUser: {
      id: "1",
      role: "owner"
    }
  });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const shop = await prisma.shop.findFirst({
    where: { domain: session.shop }
  });

  if (!shop) {
    throw new Error("Shop not found");
  }

  try {
    const action = formData.get("action");
    
    if (action === "invite_user") {
      const userData = {
        name: formData.get("name"),
        email: formData.get("email"),
        role: formData.get("role"),
        permissions: JSON.parse(formData.get("permissions") || "[]")
      };

      // Validate required fields
      if (!userData.name || !userData.email || !userData.role) {
        return json({ 
          error: "Name, email, and role are required",
          formData: userData
        }, { status: 400 });
      }

      // In a real implementation, you'd create the user and send an invitation
      // For now, we'll just return success
      return json({ 
        success: true,
        message: `Invitation sent to ${userData.email}!`
      });

    } else if (action === "update_permissions") {
      const userId = formData.get("userId");
      const permissions = JSON.parse(formData.get("permissions") || "[]");

      // In a real implementation, you'd update user permissions
      return json({ 
        success: true,
        message: "User permissions updated successfully!"
      });

    } else if (action === "remove_user") {
      const userId = formData.get("userId");

      // In a real implementation, you'd remove the user
      return json({ 
        success: true,
        message: "User removed successfully!"
      });
    }

    return json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Error managing users:", error);
    return json({ 
      error: "Failed to manage users. Please try again.",
      formData: Object.fromEntries(formData)
    }, { status: 500 });
  }
};

export default function UserSettings() {
  const { shop, users, currentUser } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  // Form state for inviting new users
  const [name, setName] = useState(actionData?.formData?.name || "");
  const [email, setEmail] = useState(actionData?.formData?.email || "");
  const [role, setRole] = useState(actionData?.formData?.role || "staff");
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  const roleOptions = [
    { label: "Select role", value: "" },
    { label: "Admin", value: "admin" },
    { label: "Staff", value: "staff" },
    { label: "Viewer", value: "viewer" }
  ];

  const availablePermissions = [
    { id: "invoices_view", label: "View Invoices", description: "Can view all invoices" },
    { id: "invoices_create", label: "Create Invoices", description: "Can create new invoices" },
    { id: "invoices_edit", label: "Edit Invoices", description: "Can modify existing invoices" },
    { id: "invoices_delete", label: "Delete Invoices", description: "Can delete invoices" },
    { id: "labels_view", label: "View Labels", description: "Can view shipping labels" },
    { id: "labels_create", label: "Create Labels", description: "Can create shipping labels" },
    { id: "labels_print", label: "Print Labels", description: "Can print shipping labels" },
    { id: "customers_view", label: "View Customers", description: "Can view customer information" },
    { id: "customers_edit", label: "Edit Customers", description: "Can modify customer data" },
    { id: "tracking_view", label: "View Tracking", description: "Can view tracking information" },
    { id: "tracking_update", label: "Update Tracking", description: "Can update tracking status" },
    { id: "bulk_operations", label: "Bulk Operations", description: "Can perform bulk operations" },
    { id: "settings_view", label: "View Settings", description: "Can view app settings" },
    { id: "settings_edit", label: "Edit Settings", description: "Can modify app settings" },
    { id: "analytics_view", label: "View Analytics", description: "Can view reports and analytics" }
  ];

  const getRoleBadge = (role) => {
    const roleConfig = {
      owner: { status: 'success', children: 'Owner' },
      admin: { status: 'attention', children: 'Admin' },
      staff: { status: 'info', children: 'Staff' },
      viewer: { status: 'subdued', children: 'Viewer' }
    };
    return <Badge {...roleConfig[role]} />;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { status: 'success', children: 'Active' },
      pending: { status: 'attention', children: 'Pending' },
      inactive: { status: 'critical', children: 'Inactive' }
    };
    return <Badge {...statusConfig[status]} />;
  };

  const userRows = users.map((user) => [
    user.name,
    user.email,
    getRoleBadge(user.role),
    getStatusBadge(user.status),
    user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('en-IN') : 'Never',
    <InlineStack gap="200">
      <Button 
        size="micro" 
        disabled={user.role === 'owner' || user.id === currentUser.id}
        url={`/app/settings/users/${user.id}/edit`}
      >
        Edit
      </Button>
      <Button 
        size="micro" 
        tone="critical"
        disabled={user.role === 'owner' || user.id === currentUser.id}
        url={`/app/settings/users/${user.id}/remove`}
      >
        Remove
      </Button>
    </InlineStack>
  ]);

  const handlePermissionChange = (permissionId, checked) => {
    if (checked) {
      setSelectedPermissions([...selectedPermissions, permissionId]);
    } else {
      setSelectedPermissions(selectedPermissions.filter(id => id !== permissionId));
    }
  };

  const getRolePermissions = (selectedRole) => {
    const rolePermissions = {
      admin: [
        'invoices_view', 'invoices_create', 'invoices_edit',
        'labels_view', 'labels_create', 'labels_print',
        'customers_view', 'customers_edit',
        'tracking_view', 'tracking_update',
        'bulk_operations', 'analytics_view'
      ],
      staff: [
        'invoices_view', 'invoices_create',
        'labels_view', 'labels_create', 'labels_print',
        'customers_view', 'tracking_view', 'tracking_update'
      ],
      viewer: [
        'invoices_view', 'labels_view', 'customers_view', 'tracking_view'
      ]
    };
    return rolePermissions[selectedRole] || [];
  };

  // Auto-select permissions based on role
  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setSelectedPermissions(getRolePermissions(newRole));
  };

  return (
    <Page
      title="User Management"
      backAction={{ url: "/app/settings" }}
      primaryAction={{
        content: "Invite User",
        loading: isSubmitting,
        onAction: () => {
          document.getElementById("invite-user-form").requestSubmit();
        }
      }}
    >
      <Layout>
        {actionData?.error && (
          <Layout.Section>
            <Banner status="critical">
              <p>{actionData.error}</p>
            </Banner>
          </Layout.Section>
        )}

        {actionData?.success && (
          <Layout.Section>
            <Banner status="success">
              <p>{actionData.message}</p>
            </Banner>
          </Layout.Section>
        )}

        {/* Current Users */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Team Members</Text>
              
              {users.length > 0 ? (
                <DataTable
                  columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
                  headings={['Name', 'Email', 'Role', 'Status', 'Last Login', 'Actions']}
                  rows={userRows}
                />
              ) : (
                <EmptyState
                  heading="No team members yet"
                  action={{
                    content: 'Invite First User',
                    onAction: () => {
                      document.getElementById("invite-user-form").requestSubmit();
                    }
                  }}
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Invite team members to help manage your GST invoices and shipping.</p>
                </EmptyState>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Invite New User */}
        <Layout.Section>
          <Card>
            <Form method="post" id="invite-user-form">
              <input type="hidden" name="action" value="invite_user" />
              <input type="hidden" name="permissions" value={JSON.stringify(selectedPermissions)} />
              
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Invite New User</Text>
                
                <FormLayout>
                  <FormLayout.Group>
                    <TextField
                      label="Full Name"
                      name="name"
                      value={name}
                      onChange={setName}
                      required
                    />
                    <TextField
                      label="Email Address"
                      name="email"
                      type="email"
                      value={email}
                      onChange={setEmail}
                      required
                    />
                  </FormLayout.Group>
                  
                  <Select
                    label="Role"
                    name="role"
                    options={roleOptions}
                    value={role}
                    onChange={handleRoleChange}
                    helpText="Role determines default permissions"
                    required
                  />
                </FormLayout>
              </BlockStack>
            </Form>
          </Card>
        </Layout.Section>

        {/* Permissions */}
        {role && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Permissions</Text>
                
                <Text variant="bodyMd" as="p" tone="subdued">
                  Customize what this user can access and modify.
                </Text>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                  gap: '16px' 
                }}>
                  {availablePermissions.map((permission) => (
                    <Card key={permission.id} sectioned>
                      <BlockStack gap="200">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectedPermissions.includes(permission.id)}
                            onChange={(e) => handlePermissionChange(permission.id, e.target.checked)}
                          />
                          <Text variant="bodyMd" fontWeight="semibold" as="span">
                            {permission.label}
                          </Text>
                        </label>
                        <Text variant="bodySm" as="p" tone="subdued">
                          {permission.description}
                        </Text>
                      </BlockStack>
                    </Card>
                  ))}
                </div>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        {/* Role Descriptions */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Role Descriptions</Text>
              
              <BlockStack gap="300">
                <Card sectioned>
                  <BlockStack gap="200">
                    <InlineStack gap="200" align="center">
                      <Badge status="success">Owner</Badge>
                      <Text variant="headingSm" as="h3">Shop Owner</Text>
                    </InlineStack>
                    <Text variant="bodyMd" as="p">
                      Full access to all features including settings, billing, and user management. 
                      Cannot be removed or have permissions changed.
                    </Text>
                  </BlockStack>
                </Card>
                
                <Card sectioned>
                  <BlockStack gap="200">
                    <InlineStack gap="200" align="center">
                      <Badge status="attention">Admin</Badge>
                      <Text variant="headingSm" as="h3">Administrator</Text>
                    </InlineStack>
                    <Text variant="bodyMd" as="p">
                      Can manage invoices, labels, customers, and tracking. 
                      Has access to bulk operations and analytics but cannot change settings.
                    </Text>
                  </BlockStack>
                </Card>
                
                <Card sectioned>
                  <BlockStack gap="200">
                    <InlineStack gap="200" align="center">
                      <Badge status="info">Staff</Badge>
                      <Text variant="headingSm" as="h3">Staff Member</Text>
                    </InlineStack>
                    <Text variant="bodyMd" as="p">
                      Can create invoices and labels, view customers, and update tracking. 
                      Limited access to bulk operations and no settings access.
                    </Text>
                  </BlockStack>
                </Card>
                
                <Card sectioned>
                  <BlockStack gap="200">
                    <InlineStack gap="200" align="center">
                      <Badge>Viewer</Badge>
                      <Text variant="headingSm" as="h3">View Only</Text>
                    </InlineStack>
                    <Text variant="bodyMd" as="p">
                      Read-only access to invoices, labels, customers, and tracking. 
                      Cannot create, edit, or delete any data.
                    </Text>
                  </BlockStack>
                </Card>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Security Settings */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Security Settings</Text>
              
              <BlockStack gap="300">
                <Text variant="bodyMd" as="p">
                  Configure security settings for your team:
                </Text>
                
                <InlineStack gap="300">
                  <Button url="/app/settings/security/two-factor">
                    Two-Factor Authentication
                  </Button>
                  <Button url="/app/settings/security/session-timeout">
                    Session Timeout
                  </Button>
                  <Button url="/app/settings/security/audit-log">
                    View Audit Log
                  </Button>
                </InlineStack>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}