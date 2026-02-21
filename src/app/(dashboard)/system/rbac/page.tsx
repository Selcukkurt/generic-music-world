"use client";

import { useState } from "react";
import PageHeader from "@/components/shell/PageHeader";
import RolesTable from "./RolesTable";
import PermissionMatrix from "./PermissionMatrix";
import RoleFormModal from "./RoleFormModal";
import DeleteConfirmModal from "./DeleteConfirmModal";
import UserAssignModal from "./UserAssignModal";
import { RoleStoreProvider, useRoleStore } from "@/lib/rbac/roleManagement/RoleStoreContext";
import { useToast } from "@/components/ui/ToastProvider";
import type { Role, RoleLevel } from "@/lib/rbac/roleManagement/types";

function RbacPageContent() {
  const toast = useToast();
  const {
    roles,
    userAssignments,
    createRole,
    updateRole,
    deleteRole,
    assignUserToRole,
  } = useRoleStore();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [userAssignModalOpen, setUserAssignModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreateRole = (data: { name: string; description: string; level: RoleLevel }) => {
    setFormError(null);
    const role = createRole(data);
    if (role) {
      setCreateModalOpen(false);
      toast.success("Rol oluşturuldu", role.name);
    } else {
      setFormError("Bu rol adı zaten kullanılıyor.");
    }
  };

  const handleEditRole = (data: { name: string; description: string; level: RoleLevel }) => {
    if (!editRole) return;
    setFormError(null);
    const updated = updateRole(editRole.id, data);
    if (updated) {
      setEditModalOpen(false);
      setEditRole(null);
      toast.success("Rol güncellendi", updated.name);
    } else {
      setFormError("Bu rol adı zaten kullanılıyor veya rol kilitli.");
    }
  };

  const handleDeleteClick = (role: Role) => {
    setRoleToDelete(role);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!roleToDelete) return;
    const name = roleToDelete.name;
    const ok = deleteRole(roleToDelete.id);
    if (ok) {
      setDeleteModalOpen(false);
      setRoleToDelete(null);
      toast.success("Rol silindi", name);
    }
  };

  const handleAssignUser = (userId: string, roleId: string) => {
    assignUserToRole(userId, roleId);
    toast.success("Kullanıcı atandı", "Rol başarıyla güncellendi.");
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Rol Yönetimi"
        subtitle="Kullanıcı rollerini ve erişim yetkilerini yönetin."
      >
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="ui-button-primary rounded-lg px-4 py-2.5 text-sm font-semibold"
        >
          + Yeni Rol Oluştur
        </button>
      </PageHeader>

      <RolesTable
        onEdit={(role) => {
          setEditRole(role);
          setEditModalOpen(true);
          setFormError(null);
        }}
        onDelete={handleDeleteClick}
        onUserAssign={() => setUserAssignModalOpen(true)}
      />
      <PermissionMatrix />

      <RoleFormModal
        key={createModalOpen ? "create-open" : "create-closed"}
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setFormError(null);
        }}
        onSubmit={handleCreateRole}
        error={formError}
      />
      <RoleFormModal
        key={editModalOpen ? (editRole?.id ?? "edit-new") : "edit-closed"}
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditRole(null);
          setFormError(null);
        }}
        onSubmit={handleEditRole}
        initialRole={editRole}
        error={formError}
      />
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setRoleToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        roleName={roleToDelete?.name ?? ""}
      />
      <UserAssignModal
        isOpen={userAssignModalOpen}
        onClose={() => setUserAssignModalOpen(false)}
        roles={roles}
        assignments={userAssignments.map((a) => ({ userId: a.userId, roleId: a.roleId }))}
        onAssign={handleAssignUser}
      />
    </div>
  );
}

export default function SystemRbacPage() {
  return (
    <RoleStoreProvider>
      <RbacPageContent />
    </RoleStoreProvider>
  );
}
