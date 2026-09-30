import { AdminPageHeader } from '../../components/admin/AdminUi';
import InventorySyncPanel from '../../components/admin/InventorySyncPanel';

export default function AdminSyncPage() {
  return (
    <div>
      <AdminPageHeader
        title="Import & sync"
        lede="Kwentra is the source of truth for inventory details. Pull the latest from Kwentra, or import a property fact sheet (.xlsx). Photos, visibility and ordering stay website-only."
      />
      <InventorySyncPanel />
    </div>
  );
}
