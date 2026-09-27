"use server";

import { requireAdmin } from "../lib/admin";
import { getPersistentStorageAdapter } from "../lib/storage";

/** Upload only; publishing is a separate audited design action. */
export async function uploadPlatformAsset(form: FormData): Promise<{ url?: string; error?: string }> {
  await requireAdmin();
  const file = form.get("file");
  if (!(file instanceof File) || !file.size || file.size > 2 * 1024 * 1024) {
    return { error: "اختر صورة بحجم لا يتجاوز 2 ميجابايت." };
  }
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    return { error: "الصيغ المدعومة: PNG وJPG وWebP." };
  }
  try {
    // The storage adapter also validates file signatures, not just browser MIME.
    const result = await getPersistentStorageAdapter().upload({ file, folder: "platform-brand" });
    return { url: result.url };
  } catch {
    return { error: "تعذر رفع الصورة. تحقق من محتواها ثم حاول مجددًا." };
  }
}
