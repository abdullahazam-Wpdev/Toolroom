import Link from "next/link";
import {ArrowUpRight,ArrowRight,Image,Search,Download,ShieldCheck} from 'lucide-react';
import {Catalog} from '@/components/catalog';
import {categories,tools} from '@/lib/catalog';
import {CategoryIcon} from '@/components/icon';
import {metadata} from '@/lib/seo';
export const generateMetadata=()=>metadata('Online image converters, SEO audits and media tools','Convert and compress images, audit a webpage, inspect technical SEO and download authorized direct media files. Real outputs with clear limits.','/');
export default function Home(){
 const available=tools.filter(t=>t.status==='available').length;
 return <section className="section page-section workspace-home">
  <div className="workspace-welcome"><div><span className="workspace-kicker">YOUR EVERYDAY TOOLBOX</span><h1>Good tools. Less busywork.</h1><p>Convert, optimize and inspect. Everything you need for the work in front of you.</p></div><span className="workspace-count"><span className="dot"/>{available} tools available</span></div>
  <div className="workspace-featured">
   <Link href="/image-tools/image-converter" className="featured-converter"><span className="featured-icon"><Image size={25}/></span><small>IMAGE ESSENTIALS</small><h2>A new format.<br/>A better fit.</h2><p>JPEG, PNG, WebP, AVIF, GIF and TIFF. Quality, dimensions and batch downloads.</p><span className="featured-action">Open image converter <ArrowRight size={17}/></span></Link>
   <Link href="/seo-tools/website-seo-checker"><span className="featured-icon"><Search size={25}/></span><small>UNDERSTAND YOUR PAGE</small><h2>SEO, with<br/>the evidence.</h2><p>Inspect static HTML, prioritize findings and export your actual audit report.</p><span className="featured-action">Audit a webpage <ArrowRight size={17}/></span></Link>
   <Link href="/social-media-tools/direct-media-downloader"><span className="featured-icon"><Download size={25}/></span><small>YOUR MEDIA, READY</small><h2>A direct link.<br/>A real file.</h2><p>Download authorized public image and video files. Clear size and access limits.</p><span className="featured-action">Download media <ArrowRight size={17}/></span></Link>
  </div>
  <div className="workspace-category-bar" aria-label="Browse categories">{categories.map(c=><Link key={c.slug} href={'/'+c.slug}><CategoryIcon category={c.slug}/><span>{c.name}</span><small>{tools.filter(t=>t.category===c.slug&&t.status==='available').length} available</small></Link>)}</div>
  <div className="workspace-section-title"><div><h2>Find your next tool</h2><p>Working tools and the roadmap, clearly labeled.</p></div><Link href="/tools">View all tools <ArrowUpRight size={16}/></Link></div>
  <Catalog compact/>
  <div className="workspace-trust"><ShieldCheck size={22}/><div><strong>Your files. Your settings. Real results.</strong><p>Image tools process files in memory. Metadata is removed by default. No account is needed for the available tools.</p></div><Link href="/privacy">Privacy details <ArrowUpRight size={15}/></Link></div>
 </section>;
}
