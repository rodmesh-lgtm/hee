import { requireAdmin } from "../../lib/admin";
import { readPlatformDesign } from "../../lib/platform-design";
import { PlatformDesignEditor } from "../../../components/admin/platform-design-editor";

export default async function DesignAdminPage() {
  await requireAdmin();
  const { draft, publishedAt } = await readPlatformDesign();
  return <PlatformDesignEditor key={JSON.stringify(draft)} initial={draft} publishedAt={publishedAt?.toISOString() ?? null}/>;
}
