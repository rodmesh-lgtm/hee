import { Globe2 } from "lucide-react";
import { FaFacebookF, FaInstagram, FaSnapchat, FaTiktok, FaXTwitter, FaYoutube } from "react-icons/fa6";

type SocialItem = {
  label: string;
  href: string;
};

type PublicSocialSectionProps = {
  links: SocialItem[];
  title?: string;
  darkMode?: boolean;
};

function iconFor(label: string) {
  const key = label.toLowerCase();
  if (key.includes("instagram")) return FaInstagram;
  if (key.includes("إكس") || key.includes("x") || key.includes("twitter")) return FaXTwitter;
  if (key.includes("tiktok") || key.includes("تيك")) return FaTiktok;
  if (key.includes("snapchat") || key.includes("سناب")) return FaSnapchat;
  if (key.includes("facebook") || key.includes("فيس")) return FaFacebookF;
  if (key.includes("youtube") || key.includes("يوتيوب")) return FaYoutube;
  return Globe2;
}

export function PublicSocialSection({ links, title = "تابعنا", darkMode = false }: PublicSocialSectionProps) {
  if (links.length === 0) {
    return null;
  }

  return (
    <section className={`p-4 ${darkMode ? "rounded-[28px] border border-white/10 bg-slate-950/70 backdrop-blur" : "rounded-[20px] border border-[#e8ebf7] bg-white"}`}>
      <h2 className={`mb-3 text-xl font-black ${darkMode ? "text-white" : "text-[#1f2552]"}`}>{title}</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {links.map((social) => {
          const Icon = iconFor(social.label);
          return (
            <a
              key={`${social.label}-${social.href}`}
              href={social.href}
              target="_blank"
              rel="noreferrer noopener nofollow"
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${darkMode ? "border-white/10 bg-white/5 text-slate-100" : "border-[#e8ebf7] bg-[#fafbff] text-slate-700"}`}
            >
              <Icon className="h-4 w-4" />
              <span>{social.label}</span>
            </a>
          );
        })}
      </div>
    </section>
  );
}
