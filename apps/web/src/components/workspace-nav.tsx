"use client";
import Link from "next/link";
import { useRef } from "react";
import { usePathname } from "next/navigation";
import { Grid2X2, Search, BookOpen, Home, Command, ChevronDown, ShieldCheck } from "lucide-react";
import { categories, tools, toolHref } from "@/lib/catalog";
import { CategoryIcon } from "./icon";
export function WorkspaceNav() {
  const path = usePathname();
  const search = useRef<HTMLInputElement>(null);
  return <>
    <header className="workspace-header">
      <Link href="/" className="workspace-brand"><span className="workspace-mark"><Command size={25}/></span><span>Toolroom<small>All-in-one online tools</small></span></Link>
      <form action="/tools" className="workspace-search" role="search"><button className="workspace-search-trigger" type="button" aria-label="Open tool search" onClick={() => search.current?.focus()}><Search size={19}/></button><input ref={search} onKeyDown={e => { if(e.key === "Escape") e.currentTarget.blur(); }} name="q" aria-label="Search the platform" placeholder="Search tools… image converter, SEO checker"/><button type="submit">Search</button></form>
      <Link className="workspace-guide" href="/guides"><BookOpen size={17}/> Guides</Link>
      <Link className="workspace-explore" href="/tools">Explore tools</Link>
    </header>
    <aside className="workspace-sidebar" aria-label="Tool navigation">
      <Link className={"sidebar-all " + (path === "/tools" ? "selected" : "")} href="/tools"><Grid2X2 size={19}/> All tools</Link>
      <nav aria-label="Tool categories">{categories.map(category => <details key={category.slug} open={path.startsWith('/'+category.slug) || undefined}>
        <summary><CategoryIcon category={category.slug}/><span>{category.name}</span><ChevronDown size={14}/></summary>
        <div className="sidebar-tool-list"><Link href={'/'+category.slug}>View category</Link>{tools.filter(tool => tool.category === category.slug && !["jpg-to-webp", "png-to-jpg", "webp-to-png"].includes(tool.id)).map(tool => <Link key={tool.id} href={toolHref(tool)} aria-current={path === toolHref(tool) ? 'page' : undefined}><span>{tool.name}</span>{tool.status !== 'available' && <small>{tool.status === 'planned' ? 'Planned' : 'API'}</small>}</Link>)}</div>
      </details>)}</nav>
      <div className="sidebar-bottom"><ShieldCheck size={19}/><p>Real tools. Clear limits.<small>Files are never saved to disk by the image tools.</small></p></div>
    </aside>
    <nav className="mobile-dock" aria-label="Mobile navigation">{[{href:'/',label:'Home',Icon:Home},{href:'/tools',label:'Tools',Icon:Grid2X2},{href:'/image-tools',label:'Images',Icon:()=> <CategoryIcon category="image-tools"/>},{href:'/seo-tools',label:'SEO',Icon:Search},{href:'/guides',label:'Guides',Icon:BookOpen}].map(({href,label,Icon}) => <Link key={href} href={href} aria-current={(href === '/' ? path === '/' : path.startsWith(href)) ? 'page' : undefined}><Icon size={20}/><span>{label}</span></Link>)}</nav>
  </>;
}
