import Link from 'next/link'
import { DM_Sans, DM_Serif_Display } from 'next/font/google'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '600', '800'],
  variable: '--font-dm-sans',
})

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-dm-serif',
})

export default function LandingPage() {
  // ── DATA (unchanged) ────────────────────────────────────────────────────────
  const skills = [
    { name: 'Graphic Design', category: 'Creative Arts', count: '120+', emoji: '🎨' },
    { name: 'Python',         category: 'Programming',   count: '300+', emoji: '🐍' },
    { name: 'Cooking',        category: 'Culinary Arts', count: '85+',  emoji: '🍳' },
    { name: 'Photography',    category: 'Visual Arts',   count: '150+', emoji: '📷' },
  ]
  const steps = [
    { n: '1', title: 'Create Profile', icon: '👤', desc: "Build your professional presence. Showcase your journey, your expertise, and what you're hungry to learn next." },
    { n: '2', title: 'Post Skills',    icon: '📋', desc: 'List the crafts and disciplines you excel at. From coding to sourdough, every expertise has a valued place here.' },
    { n: '3', title: 'Swap',           icon: '↔️', desc: 'Connect with fellow makers. Propose a mutual exchange of time and knowledge to grow together.' },
  ]
  const swappers = [
    { name: 'Sarah Chen',    title: 'Senior Product Designer', skills: ['UI/UX', 'Figma'] },
    { name: 'Marcus Rivera', title: 'Full-stack Developer',    skills: ['React', 'Node.js'] },
    { name: 'Elena Gilbert', title: 'Professional Chef',       skills: ['Baking', 'Italian'] },
  ]
  const testimonials = [
    {
      body: "I traded my SEO knowledge for two weeks of beginner cello lessons. The Hub didn't just teach me a skill; it connected me with a world-class musician I never would have met otherwise.",
      name: 'Marcus Chen', role: 'Digital Strategist & Aspiring Cellist',
    },
    {
      body: "The quality of interactions here is unparalleled. People aren't just 'users' — they are passionate mentors. I've scaled my startup's backend by swapping UI advice with a senior engineer.",
      name: 'Sarah Jenkins', role: 'Product Founder',
    },
  ]

  const avatarGrad = (name: string) => {
    const g = ['from-blue-500 to-indigo-600', 'from-emerald-400 to-teal-600', 'from-amber-400 to-orange-500', 'from-rose-400 to-pink-600']
    return g[name.charCodeAt(0) % g.length]
  }

  // Tighter container — 960px max with comfortable padding
  const C = 'max-w-7xl mx-auto px-6'
  const serif = '[font-family:var(--font-dm-serif)]'

  return (
    <div
      className={`min-h-screen bg-white ${dmSans.variable} ${dmSerif.variable}`}
      style={{ fontFamily: 'var(--font-dm-sans)' }}
    >

      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className={`${C} h-14 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-sm tracking-tight">Skill-Swap Hub</span>
          </div>

          {/* <div className="hidden md:flex items-center gap-0.5 text-sm text-gray-500 font-medium">
            {['Dashboard','Browse Skills','My Profile','Messages','Notifications'].map(l => (
              <a key={l} href="#" className="px-3 py-1.5 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors">{l}</a>
            ))}
          </div> */}

          <div className="flex items-center gap-2">
            <Link href="/login" className="text-sm font-semibold text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              Login
            </Link>
            <Link href="/register" className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors shadow-sm">
              Post a Skill
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className={`${C} pt-10 pb-12 grid md:grid-cols-2 gap-10 items-center`}>
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full mb-5">
            Community Learning
          </span>
          <h1 className={`${serif} text-[3.5rem] leading-[1.05] text-gray-900 mb-4`}>
            Exchange Skills,<br />
            Learn Anything.
          </h1>
          <p className="text-gray-500 text-base leading-relaxed mb-6 max-w-sm">
            Learn from others by sharing what you know. Join a premium network of experts and enthusiasts trading knowledge in a curated commons.
          </p>
          <div className="flex items-center gap-3">
            <Link href="/register" className="inline-flex items-center bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-colors shadow-sm">
              Get Started
            </Link>
            <Link href="#skills" className="inline-flex items-center border border-gray-200 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
              Browse Skills
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="relative rounded-2xl overflow-hidden h-64 bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-2">🤝</div>
              <p className="text-slate-500 text-sm font-medium">Connect & Learn Together</p>
              <div className="mt-3 flex items-center justify-center gap-2">
                <div className="flex -space-x-2">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-7 h-7 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                      {i+1}
                    </div>
                  ))}
                </div>
                <span className="text-blue-600 font-semibold text-xs">+12 tutors online</span>
              </div>
            </div>
          </div>
          {/* Floating badge */}
          <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-lg border border-gray-100 px-4 py-2.5 flex items-center gap-3 max-w-[260px]">
            <div className="w-7 h-7 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">Top Exchange</p>
              <p className="text-[11px] text-gray-400 leading-tight">Digital Design for Artisanal Carpentry swap completed.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────────────── */}
      <section id="how" className="bg-slate-50 py-12">
        <div className={C}>
          <div className="mb-8">
            <h2 className={`${serif} text-4xl text-gray-900 mb-2`}>How It Works</h2>
            <div className="w-10 h-[3px] bg-blue-600 rounded-full" />
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map(s => (
              <div key={s.n} className="group">
                <div className="w-11 h-11 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-lg mb-4 shadow-sm group-hover:shadow-md group-hover:border-blue-200 transition-all">
                  {s.icon}
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-1.5">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Popular Skills ───────────────────────────────────────────────────── */}
      <section id="skills" className="py-12">
        <div className={C}>
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className={`${serif} text-4xl text-gray-900 mb-1`}>Popular Skills</h2>
              <p className="text-gray-400 text-sm">The most sought-after expertise in our community today.</p>
            </div>
            <Link href="/register" className="text-sm font-semibold text-blue-600 hover:underline">
              Explore all skills →
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3" style={{ gridAutoRows: '148px' }}>
            {/* Large dark featured card — spans 2 rows */}
            <div className="row-span-2 rounded-2xl overflow-hidden relative bg-gray-800 cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/20 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-10">🎨</div>
              <div className="absolute top-3 left-3">
                <span className="text-[9px] font-bold tracking-widest text-white bg-amber-500 px-2 py-0.5 rounded-full uppercase">Most Trending</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className={`${serif} text-xl text-white mb-1`}>UI/UX Strategy</h3>
                <p className="text-gray-300 text-xs leading-relaxed">Learn the psychology of digital experiences from lead designers.</p>
                <div className="mt-2.5 flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                    {[0,1,2].map(i => <div key={i} className="w-5 h-5 rounded-full bg-blue-400 border-2 border-gray-800" />)}
                  </div>
                  <span className="text-gray-400 text-xs">+12</span>
                </div>
              </div>
            </div>

            {/* Sustainable Gardening */}
            <div className="col-span-1 md:col-span-2 rounded-2xl border border-gray-100 bg-white p-4 hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Community Learning</p>
                  <h3 className="font-bold text-gray-900 text-sm">Sustainable Gardening</h3>
                  <p className="text-gray-500 text-xs mt-0.5">Master urban permaculture and regenerative systems.</p>
                </div>
                <span className="text-2xl">🌱</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="flex -space-x-1.5">
                    {[0,1,2].map(i => <div key={i} className="w-5 h-5 rounded-full bg-emerald-400 border border-white" />)}
                  </div>
                  <span className="text-xs text-gray-500">48 Mentors</span>
                </div>
                <button className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-sm transition-colors">+</button>
              </div>
            </div>

            {/* Python */}
            <div className="rounded-2xl bg-blue-600 p-4 cursor-pointer hover:bg-blue-700 transition-colors flex flex-col justify-between">
              <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center text-white text-xs font-bold font-mono">{'<>'}</div>
              <div>
                <h3 className="font-bold text-white text-sm">Python for Data</h3>
                <p className="text-blue-200 text-xs mt-0.5">24 Swaps this week</p>
              </div>
            </div>

            {/* Spanish */}
            <div className="rounded-2xl bg-emerald-400 p-4 cursor-pointer hover:bg-emerald-500 transition-colors flex flex-col justify-between">
              <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center text-base">🌐</div>
              <div>
                <h3 className="font-bold text-white text-sm">Conversational Spanish</h3>
                <p className="text-emerald-100 text-xs mt-0.5">Native speakers available</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quote + Testimonials ─────────────────────────────────────────────── */}
      <section className="py-12 bg-slate-50">
        <div className={C}>
          <blockquote className={`${serif} text-3xl text-gray-900 text-center mb-2 leading-snug`}>
            "Knowledge increases by sharing but not by saving."
          </blockquote>
          <p className="text-center text-gray-400 text-sm mb-8">Hear from our community of builders and dreamers.</p>
          <div className="grid md:grid-cols-2 gap-4">
            {testimonials.map(t => (
              <div key={t.name} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
                <p className="text-gray-600 text-sm leading-relaxed mb-4">"{t.body}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarGrad(t.name)} flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0`}>
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Meet Popular Swappers ────────────────────────────────────────────── */}
      <section className="py-12">
        <div className={C}>
          <h2 className={`${serif} text-4xl text-gray-900 mb-1`}>Meet Popular Swappers</h2>
          <p className="text-gray-400 text-sm mb-6">Connect with highly-rated mentors from our community.</p>
          <div className="grid md:grid-cols-3 gap-4">
            {swappers.map(s => (
              <div key={s.name} className="group bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-lg hover:border-blue-100 transition-all cursor-pointer flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${avatarGrad(s.name)} flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform`}>
                  {s.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{s.name}</p>
                  <p className="text-gray-400 text-xs mb-1.5">{s.title}</p>
                  <div className="flex gap-1 flex-wrap">
                    {s.skills.map(sk => (
                      <span key={sk} className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="py-10">
        <div className={C}>
          <div className="bg-blue-600 rounded-3xl px-8 py-12 text-center relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-blue-500/40" />
            <div className="absolute -bottom-12 -left-8 w-56 h-56 rounded-full bg-blue-500/30" />
            <div className="relative z-10">
              <h2 className={`${serif} text-4xl text-white mb-3 leading-tight`}>
                Ready to join the<br />curated commons?
              </h2>
              <p className="text-blue-200 text-sm mb-6 max-w-sm mx-auto">
                Stop paying for courses. Start building connections and mastering crafts through genuine human exchange.
              </p>
              <Link href="/register" className="inline-flex items-center bg-white text-blue-700 font-bold text-sm px-7 py-3 rounded-full hover:bg-blue-50 transition-colors shadow-md">
                Create Your Free Profile
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-gray-100 py-10">
        <div className={`${C} grid grid-cols-2 md:grid-cols-4 gap-8`}>
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
                </svg>
              </div>
              <span className="font-bold text-gray-900 text-sm">Skill-Swap Hub</span>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed">A premium learning community dedicated to the democratic exchange of human expertise and craft.</p>
          </div>
          {[
            { title: 'Platform', links: ['About', 'Community Guidelines', 'Safety Center'] },
            { title: 'Legal',    links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'] },
            { title: 'Support',  links: ['Contact Support', 'Help Center'] },
          ].map(col => (
            <div key={col.title}>
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map(l => (
                  <li key={l}><a href="#" className="text-xs text-gray-400 hover:text-gray-900 transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className={`${C} mt-8 pt-5 border-t border-gray-100 flex items-center justify-between`}>
          <p className="text-xs text-gray-400">© 2024 Skill-Swap Hub. The Curated Commons.</p>
          <div className="flex items-center gap-2">
            <button className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-xs transition-colors">𝕏</button>
            <button className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-xs transition-colors">in</button>
          </div>
        </div>
      </footer>
    </div>
  )
}