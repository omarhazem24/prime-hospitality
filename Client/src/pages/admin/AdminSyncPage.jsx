import { AdminPageHeader } from '../../components/admin/AdminUi';
import InventorySyncPanel from '../../components/admin/InventorySyncPanel';

export default function AdminSyncPage() {
  return (
    <div>
      <AdminPageHeader
        title="Kwentra sync"
        lede="Kwentra is the source of truth for inventory details — add a unit in Kwentra and it appears here automatically. Photos, visibility and ordering stay website-only."
      />
      <InventorySyncPanel />
    </div>
  );
}
