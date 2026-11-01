// Build targets and branch names do not prove database isolation. Never mutate a
// database (including migration recovery) from a deployment build. Schema changes
// belong to the backed-up, attested migration workflow. The following read-only
// compatibility gate still blocks managed previews with a mismatched schema.
console.log("[rc-preview-schema-sync] DISABLED — builds never apply or recover database migrations; use the reviewed migration workflow");
