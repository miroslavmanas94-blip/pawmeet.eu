'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

type Course = { id: string; author_id: string; title: string; summary: string; content: string; level: string; category: string; is_published: boolean; created_at: string }
type Option = { id: string; label: string; position: number }
type Question = { id: string; prompt: string; position: number; options: Option[] }
type QuizOptionDraft = { label: string; correct: boolean }
type QuizQuestionDraft = { prompt: string; options: QuizOptionDraft[] }
const supabase = createClient()
const blankQuestion = (): QuizQuestionDraft => ({ prompt: '', options: [{ label: '', correct: true }, { label: '', correct: false }, { label: '', correct: false }] })

export default function AcademyPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState('')
  const [selected, setSelected] = useState<Course | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [draftTitle, setDraftTitle] = useState('')
  const [draftSummary, setDraftSummary] = useState('')
  const [draftContent, setDraftContent] = useState('')
  const [draftLevel, setDraftLevel] = useState('základní')
  const [draftCategory, setDraftCategory] = useState('Výchova')
  const [quiz, setQuiz] = useState<QuizQuestionDraft[]>([blankQuestion(), blankQuestion(), blankQuestion()])
  const [showAuthorForm, setShowAuthorForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [lastResult, setLastResult] = useState<{score:number;passed:boolean;certificate_id:string|null}|null>(null)
  const canAuthor = ['admin','administrator','trainer','trenér'].includes(role.toLowerCase())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id || '')
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
        setRole(profile?.role || '')
      }
      const { data, error } = await supabase.from('courses').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setCourses((data || []) as Course[])
    } catch (error) {
      console.error('Načtení akademie selhalo:', error)
      setNotice('Kurzy se nepodařilo načíst. Zkontroluj připojení a oprávnění.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const openCourse = async (course: Course) => {
    setSelected(course); setAnswers({}); setLastResult(null); setNotice('')
    const { data: questionsData, error } = await supabase.from('course_questions').select('id,prompt,position').eq('course_id', course.id).order('position')
    if (error) { setNotice('Test se nepodařilo načíst.'); return }
    const full = await Promise.all((questionsData || []).map(async (q: Omit<Question,'options'>) => {
      const { data: opts, error: optionError } = await supabase.from('course_options').select('id,label,position').eq('question_id',q.id).order('position')
      if (optionError) throw optionError
      return { ...q, options: (opts || []) as Option[] }
    }))
    setQuestions(full)
  }

  const createCourse = async (event: FormEvent) => {
    event.preventDefault()
    if (!canAuthor || !userId) return
    if (quiz.length < 3 || quiz.length > 20 || quiz.some(q => !q.prompt.trim() || q.options.length < 2 || q.options.length > 6 || q.options.some(o=>!o.label.trim()) || q.options.filter(o=>o.correct).length!==1)) {
      setNotice('Test musí mít 3–20 otázek. Každá potřebuje 2–6 možností a právě jednu správnou odpověď.')
      return
    }
    setSaving(true); setNotice('')
    try {
      const { data, error } = await supabase.rpc('create_course_with_test', {
        course_title: draftTitle.trim(), course_summary: draftSummary.trim(), course_content: draftContent.trim(),
        course_level: draftLevel, course_category: draftCategory,
        quiz: quiz.map(q=>({prompt:q.prompt.trim(),options:q.options.map(o=>({label:o.label.trim(),correct:o.correct}))}))
      })
      if (error) throw error
      setDraftTitle(''); setDraftSummary(''); setDraftContent(''); setQuiz([blankQuestion(),blankQuestion(),blankQuestion()]); setShowAuthorForm(false)
      setNotice('Kurz a závěrečný test byly publikovány.')
      await load()
    } catch (error) {
      console.error('Vytvoření kurzu selhalo:', error)
      setNotice('Kurz se nepodařilo vytvořit. Ověř, že máš schválenou roli trenéra nebo administrátora.')
    } finally { setSaving(false) }
  }

  const submitTest = async (event: FormEvent) => {
    event.preventDefault()
    if (!selected || !userId) { setNotice('Pro absolvování testu se přihlas.'); return }
    if (!questions.length || questions.some(q=>!answers[q.id])) { setNotice('Odpověz na všechny otázky.'); return }
    setSaving(true); setNotice('')
    try {
      const { data, error } = await supabase.rpc('submit_course_test', { course_uuid: selected.id, selected_option_ids: questions.map(q=>answers[q.id]) })
      if (error) throw error
      const result = Array.isArray(data) ? data[0] : data
      setLastResult({score:Number(result.score),passed:Boolean(result.passed),certificate_id:result.certificate_id||null})
      setNotice(result.passed ? 'Výborně — splnil jsi limit 90 %. Certifikát byl vystaven nebo už existuje.' : 'Test zatím nebyl splněn. Můžeš ho kdykoli opakovat.')
    } catch (error) {
      console.error('Odeslání testu selhalo:', error)
      setNotice('Výsledek testu se nepodařilo uložit. Zkus to znovu.')
    } finally { setSaving(false) }
  }

  const updateQuizOption = (qi:number,oi:number,patch:Partial<QuizOptionDraft>) => setQuiz(old=>old.map((q,i)=>i===qi?{...q,options:q.options.map((o,j)=>j===oi?{...o,...patch,...(patch.correct?{}:{})}:patch.correct?{...o,correct:false}:o)}:q))

  return <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 pb-28 text-[var(--pm-forest)] md:px-8">
    <Link href="/training" className="text-sm font-semibold text-[var(--pm-green)] hover:underline">← Zpět na tréninkový deník</Link>
    <header className="mt-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--pm-muted)]">PawMeet · Psí akademie</p><h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Kurzy a certifikace</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--pm-muted)]">Uč se vlastním tempem. Závěrečný test je potřeba splnit alespoň na 90 %. Trenéři a administrátoři mohou publikovat kurzy a testy.</p></header>
    {notice&&<p role="status" className="mt-5 rounded-xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-3 text-sm">{notice}</p>}
    {canAuthor&&<div className="mt-5"><button type="button" onClick={()=>setShowAuthorForm(v=>!v)} className="rounded-xl bg-[var(--pm-green)] px-4 py-3 text-sm font-semibold text-white">{showAuthorForm?'Zavřít editor':'Vytvořit kurz'}</button></div>}
    {showAuthorForm&&canAuthor&&<section className="mt-4 rounded-2xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-5 md:p-6"><h2 className="text-lg font-semibold">Nový kurz</h2><form onSubmit={createCourse} className="mt-4 grid gap-3">
      <label className="text-sm font-medium">Název<input required maxLength={180} value={draftTitle} onChange={e=>setDraftTitle(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--pm-line)] bg-transparent p-3"/></label>
      <label className="text-sm font-medium">Stručný popis<input required maxLength={600} value={draftSummary} onChange={e=>setDraftSummary(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--pm-line)] bg-transparent p-3"/></label>
      <label className="text-sm font-medium">Obsah kurzu<textarea required rows={7} maxLength={30000} value={draftContent} onChange={e=>setDraftContent(e.target.value)} placeholder="Vysvětlení, postup, bezpečnostní poznámky a praktické kroky…" className="mt-1.5 w-full rounded-xl border border-[var(--pm-line)] bg-transparent p-3"/></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Úroveň<select value={draftLevel} onChange={e=>setDraftLevel(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--pm-line)] bg-transparent p-3"><option>základní</option><option>pokročilá</option><option>expert</option></select></label><label className="text-sm font-medium">Téma<select value={draftCategory} onChange={e=>setDraftCategory(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--pm-line)] bg-transparent p-3"><option>Výchova</option><option>Poslušnost</option><option>Socializace</option><option>Dog Puller</option><option>Agility</option><option>Dogdancing</option><option>Štěňata</option><option>Péče a welfare</option><option>Čichací hry</option></select></label></div>
      <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Závěrečný test</h3><button type="button" disabled={quiz.length>=20} onClick={()=>setQuiz(old=>[...old,blankQuestion()])} className="rounded-lg border border-[var(--pm-line)] px-3 py-2 text-sm disabled:opacity-40">Přidat otázku</button></div>
      {quiz.map((q,qi)=><div key={qi} className="rounded-xl border border-[var(--pm-line)] p-3"><div className="flex items-center justify-between gap-3"><h4 className="text-sm font-semibold">Otázka {qi+1}</h4>{quiz.length>3&&<button type="button" onClick={()=>setQuiz(old=>old.filter((_,i)=>i!==qi))} className="text-xs text-[var(--pm-muted)]">Odebrat</button>}</div><input required maxLength={800} value={q.prompt} onChange={e=>setQuiz(old=>old.map((x,i)=>i===qi?{...x,prompt:e.target.value}:x))} placeholder="Znění otázky" className="mt-2 w-full rounded-lg border border-[var(--pm-line)] bg-transparent p-2.5 text-sm"/><div className="mt-2 space-y-2">{q.options.map((o,oi)=><div key={oi} className="flex items-center gap-2"><input type="radio" name={'correct-'+qi} checked={o.correct} onChange={()=>updateQuizOption(qi,oi,{correct:true})} aria-label="Správná odpověď" /><input required maxLength={300} value={o.label} onChange={e=>updateQuizOption(qi,oi,{label:e.target.value})} placeholder={'Možnost '+(oi+1)} className="min-w-0 flex-1 rounded-lg border border-[var(--pm-line)] bg-transparent p-2.5 text-sm"/>{q.options.length>2&&<button type="button" onClick={()=>setQuiz(old=>old.map((x,i)=>i===qi?{...x,options:x.options.filter((_,j)=>j!==oi).map((opt,j)=>({...opt,correct:j===0?opt.correct:opt.correct}))}:x))} className="px-1 text-xs text-[var(--pm-muted)]">Odebrat</button>}</div>)}</div><div className="mt-2 flex gap-2">{q.options.length<6&&<button type="button" onClick={()=>setQuiz(old=>old.map((x,i)=>i===qi?{...x,options:[...x.options,{label:'',correct:false}]}:x))} className="text-xs font-semibold text-[var(--pm-green)]">Přidat možnost</button>}{q.options.length>2&&<button type="button" onClick={()=>setQuiz(old=>old.map((x,i)=>i===qi?{...x,options:x.options.slice(0,-1)}:x))} className="text-xs text-[var(--pm-muted)]">Odebrat poslední možnost</button>}</div></div>)}
      <button disabled={saving} className="rounded-xl bg-[var(--pm-green)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving?'Publikuji…':'Publikovat kurz a test'}</button>
    </form></section>}
    {selected&&<section className="mt-6 rounded-2xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-5 md:p-6"><button type="button" onClick={()=>{setSelected(null);setQuestions([]);setAnswers({});setLastResult(null)}} className="text-sm font-semibold text-[var(--pm-green)]">← Všechny kurzy</button><h2 className="mt-4 text-2xl font-bold">{selected.title}</h2><p className="mt-2 text-sm text-[var(--pm-muted)]">{selected.category} · {selected.level}</p><p className="mt-4 whitespace-pre-wrap text-sm leading-7">{selected.content}</p><div className="mt-6 border-t border-[var(--pm-line)] pt-5"><h3 className="text-lg font-semibold">Závěrečný test</h3><p className="mt-1 text-sm text-[var(--pm-muted)]">K úspěšnému dokončení je potřeba alespoň 90 %. Test můžeš opakovat.</p>{questions.length===0?<p className="mt-3 text-sm text-[var(--pm-muted)]">Načítám otázky nebo kurz zatím nemá test.</p>:<form onSubmit={submitTest} className="mt-4 space-y-5">{questions.map((q,i)=><fieldset key={q.id} className="rounded-xl border border-[var(--pm-line)] p-4"><legend className="px-1 text-sm font-semibold">{i+1}. {q.prompt}</legend><div className="mt-2 space-y-2">{q.options.map(o=><label key={o.id} className="flex items-start gap-2 rounded-lg px-2 py-2 text-sm hover:bg-[var(--pm-hover)]"><input type="radio" name={q.id} checked={answers[q.id]===o.id} onChange={()=>setAnswers(old=>({...old,[q.id]:o.id}))} className="mt-0.5"/><span>{o.label}</span></label>)}</div></fieldset>)}<button disabled={saving||!userId} className="rounded-xl bg-[var(--pm-green)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving?'Vyhodnocuji…':'Odeslat test'}</button></form>}</div>{lastResult&&<div className="mt-4 rounded-xl border border-[var(--pm-line)] p-4"><p className="font-semibold">Výsledek: {lastResult.score} %</p><p className="mt-1 text-sm">{lastResult.passed?'Kurz splněn. Certifikát je připraven.':'Kurz zatím nesplněn; zkus test znovu.'}</p>{lastResult.certificate_id&&<Link href="/certificates" className="mt-3 inline-block text-sm font-semibold text-[var(--pm-green)] underline">Otevřít certifikáty</Link>}</div>}</section>}
    <section className="mt-8"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Dostupné kurzy</h2><span className="text-xs text-[var(--pm-muted)]">{courses.length}</span></div>{loading?<p className="mt-4 text-sm text-[var(--pm-muted)]">Načítám…</p>:courses.length===0?<p className="mt-4 rounded-2xl border border-dashed border-[var(--pm-line)] p-6 text-sm text-[var(--pm-muted)]">Zatím tu nejsou kurzy. Schválený trenér nebo administrátor může vytvořit první kurz i závěrečný test.</p>:<div className="mt-4 grid gap-3 md:grid-cols-2">{courses.map(course=><article key={course.id} className="rounded-2xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-5"><p className="text-xs text-[var(--pm-muted)]">{course.category} · {course.level}</p><h3 className="mt-2 text-lg font-semibold">{course.title}</h3><p className="mt-2 text-sm leading-6 text-[var(--pm-muted)]">{course.summary}</p><button type="button" onClick={()=>void openCourse(course)} className="mt-4 rounded-xl border border-[var(--pm-line)] px-4 py-2.5 text-sm font-semibold">Otevřít kurz</button></article>)}</div>}</section>
  </main>
}
