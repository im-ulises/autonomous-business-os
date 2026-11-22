"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { createClient, type Session } from "@supabase/supabase-js";
import {
  AutonomousApiClient, type ApiCompany, type ApiProject, type ApiProjectMember,
  type ApiTask, type ApiWorkspaceMember,
} from "@/lib/api-client";

type Workspace = { id: string; name: string; role: "owner" | "editor" | "viewer" };
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
const API_URL = process.env.NEXT_PUBLIC_AUTONOMOUS_API_URL || "";

export function CollaborationConsole() {
  const supabase = useMemo(
    () => SUPABASE_URL && SUPABASE_KEY
      ? createClient(SUPABASE_URL, SUPABASE_KEY, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        })
      : null, [],
  );
  const api = useMemo(() => supabase && API_URL
    ? new AutonomousApiClient(API_URL, async () => {
        const result = await supabase.auth.getSession();
        const token = result.data.session?.access_token;
        if (!token) throw new Error("Tu sesión venció. Vuelve a iniciar sesión.");
        return token;
      })
    : null, [supabase]);

  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [companies, setCompanies] = useState<ApiCompany[]>([]);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [members, setMembers] = useState<ApiWorkspaceMember[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [shares, setShares] = useState<ApiProjectMember[]>([]);
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [taskName, setTaskName] = useState("");
  const [newMemberId, setNewMemberId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"editor" | "viewer">("editor");
  const [shareSubject, setShareSubject] = useState("");
  const [shareRole, setShareRole] = useState<"editor" | "viewer">("editor");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeWorkspace = workspaces.find(w => w.id === workspaceId);
  const isOwner = activeWorkspace?.role === "owner";
  const selected = projects.find(p => p.id === selectedProjectId);

  useEffect(() => {
    if (!supabase) { setAuthReady(true); return; }
    let mounted = true;
    supabase.auth.getSession().then(({ data, error: authError }) => {
      if (!mounted) return;
      if (authError) setError(authError.message);
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, next) => { if (mounted) setSession(next); },
    );
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [supabase]);

  const refreshWorkspaces = useCallback(async () => {
    if (!api) return;
    const next = await api.listWorkspaces() as Workspace[];
    setWorkspaces(next);
    setWorkspaceId(prev => next.some(w => w.id === prev) ? prev : next[0]?.id || "");
  }, [api]);

  useEffect(() => {
    if (!session || !api) {
      setWorkspaces([]); setWorkspaceId(""); setProjects([]); setMembers([]); return;
    }
    refreshWorkspaces().catch(e => setError(String(e)));
  }, [session?.user.id, api, refreshWorkspaces]);

  const refreshProjects = useCallback(async () => {
    if (!api || !workspaceId) return;
    setLoading(true);
    try {
      const [companyRows, sharedRows] = await Promise.all([
        api.listCompanies(workspaceId),
        api.listSharedProjects(workspaceId),
      ]);
      const byCompany = await Promise.all(companyRows.map(c => api.listProjects(workspaceId, c.id)));
      const merged = new Map<string, ApiProject>();
      [...byCompany.flat(), ...sharedRows].forEach(p => merged.set(p.id, p));
      setCompanies(companyRows);
      setProjects([...merged.values()].sort((a, b) => b.created_at.localeCompare(a.created_at)));
      setSelectedProjectId(prev => merged.has(prev) ? prev : "");
      if (isOwner) setMembers(await api.listWorkspaceMembers(workspaceId));
      else setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [api, workspaceId, isOwner]);

  useEffect(() => {
    if (!workspaceId) { setCompanies([]); setProjects([]); setMembers([]); return; }
    refreshProjects().catch(e => setError(String(e)));
  }, [refreshProjects, workspaceId]);

  const refreshSelected = useCallback(async () => {
    if (!api || !workspaceId || !selectedProjectId) return;
    const rows = await api.listTasks(workspaceId, selectedProjectId);
    setTasks(rows);
    if (isOwner) setShares(await api.listProjectMembers(workspaceId, selectedProjectId));
    else setShares([]);
  }, [api, workspaceId, selectedProjectId, isOwner]);

  useEffect(() => {
    if (!selectedProjectId) { setTasks([]); setShares([]); return; }
    refreshSelected().catch(e => setError(String(e)));
  }, [refreshSelected]);

  async function perform(fn: () => Promise<unknown>, after?: () => void) {
    setBusy(true); setError("");
    try { await fn(); after?.(); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  function emailLogin(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    void perform(async () => {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin + "/collaboration",
          shouldCreateUser: false,
        },
      });
      if (authError) throw authError;
      setSent(true);
    });
  }

  const configured = Boolean(supabase && api);
  if (!configured) return (
    <main className="collab-app"><div className="collab-center">
      <span className="collab-eyebrow">AUTONOMOUS OS · STAGING</span>
      <h1>El acceso multiusuario todavía no está conectado.</h1>
      <p>Faltan NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY y NEXT_PUBLIC_AUTONOMOUS_API_URL en el entorno de staging.</p>
      <a href="/">Volver a la demo</a>
    </div></main>
  );

  if (!authReady) return <main className="collab-app"><div className="collab-center">Verificando sesión…</div></main>;

  if (!session) return (
    <main className="collab-app"><div className="collab-center collab-login">
      <span className="collab-eyebrow">AUTONOMOUS OS · EQUIPO</span>
      <h1>Tu espacio de trabajo</h1>
      <p>Inicia sesión con el correo que fue invitado a Autonomous OS. Cada persona tiene su propia cuenta.</p>
      <form onSubmit={emailLogin} className="collab-form">
        <label htmlFor="collab-email">Correo electrónico</label>
        <input id="collab-email" type="email" autoComplete="email" required
          value={email} onChange={e => setEmail(e.target.value)}
          placeholder="tucorreo@ejemplo.com"/>
        <button disabled={busy} type="submit">Enviar enlace de acceso</button>
      </form>
      {sent && <p role="status">Revisa tu correo para abrir el enlace de inicio de sesión.</p>}
      {error && <p role="alert" className="collab-error">{error}</p>}
      <a href="/">Volver a la demo</a>
    </div></main>
  );

  return (
    <main className="collab-app">
      <header className="collab-header">
        <div><span className="collab-eyebrow">AUTONOMOUS OS</span><h1>Proyectos del equipo</h1></div>
        <div className="collab-user">
          <span>{session.user.email || "Cuenta autenticada"}</span>
          <button className="collab-ghost" onClick={() => void perform(async () => {
            const { error: authError } = await supabase.auth.signOut();
            if (authError) throw authError;
          })}>Salir</button>
        </div>
      </header>

      <div className="collab-layout">
        <aside className="collab-aside">
          <label htmlFor="collab-workspace">Espacio de trabajo</label>
          <select id="collab-workspace" value={workspaceId}
            onChange={e => { setWorkspaceId(e.target.value); setSelectedProjectId(""); }}>
            {workspaces.map(w => <option key={w.id} value={w.id}>{w.name} · {w.role}</option>)}
          </select>
          <div className="collab-section-title">Tus proyectos <span>{projects.length}</span></div>
          {loading && <p className="collab-muted">Sincronizando…</p>}
          {projects.map(p => (
            <button key={p.id} className={"collab-project" + (selectedProjectId === p.id ? " active" : "")}
              onClick={() => setSelectedProjectId(p.id)}>
              <strong>{p.name}</strong><small>{companies.find(c => c.id === p.company_id)?.name || "Proyecto compartido"}</small>
            </button>
          ))}
          {!projects.length && !loading && <p className="collab-muted">Todavía no tienes proyectos asignados.</p>}
        </aside>

        <section className="collab-main">
          {!workspaceId ? (
            <div className="collab-panel">
              <h2>Cuenta autenticada</h2>
              <p>Todavía no tienes un espacio asignado. El administrador debe agregar tu ID de usuario a su equipo.</p>
              <label>Tu ID de usuario (para compartir con el administrador)</label>
              <code className="collab-code">{session.user.id}</code>
              <button className="collab-ghost" onClick={() => navigator.clipboard.writeText(session.user.id)}>Copiar ID</button>
            </div>
          ) : (
            <>
              <div className="collab-summary">
                <div><span>Espacio</span><strong>{activeWorkspace?.name}</strong></div>
                <div><span>Tu permiso</span><strong>{activeWorkspace?.role === "owner" ? "Administrador" : activeWorkspace?.role === "editor" ? "Editor" : "Lector"}</strong></div>
                <div><span>Proyectos visibles</span><strong>{projects.length}</strong></div>
              </div>
              {error && <p role="alert" className="collab-error">{error}</p>}
              {isOwner && <div className="collab-panel">
                <h2>Administración</h2>
                <div className="collab-form-row">
                  <form onSubmit={e => {e.preventDefault();void perform(async () => {
                    await api.createCompany(workspaceId,companyName.trim());
                    await refreshProjects(); setCompanyName("");
                  });}}>
                    <label>Crear empresa</label><input required value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Nombre"/>
                    <button disabled={busy}>Crear</button>
                  </form>
                  <form onSubmit={e => {e.preventDefault();void perform(async () => {
                    await api.createProject(workspaceId,companyId,projectName.trim());
                    await refreshProjects(); setProjectName("");
                  });}}>
                    <label>Crear proyecto</label>
                    <select required value={companyId} onChange={e => setCompanyId(e.target.value)}>
                      <option value="">Seleccionar empresa</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <input required value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Nombre del proyecto"/>
                    <button disabled={busy}>Crear</button>
                  </form>
                </div>
              </div>}
              {isOwner && <div className="collab-panel">
                <h2>Miembros del equipo</h2>
                <p>Invita al otro usuario desde Supabase Auth y pídele su ID. No compartas contraseñas ni uses una cuenta común.</p>
                <div className="collab-member-list">
                  {members.map(m => <span key={m.subject}>{m.subject === session.user.id ? "Tu cuenta" : m.subject.slice(0, 8) + "…"} · {m.role}</span>)}
                </div>
                <form className="collab-inline" onSubmit={e => {e.preventDefault();void perform(async () => {
                  await api.addWorkspaceMember(workspaceId,newMemberId.trim(),newMemberRole);
                  setNewMemberId(""); await refreshProjects();
                });}}>
                  <input required value={newMemberId} onChange={e => setNewMemberId(e.target.value)} placeholder="ID verificado del segundo usuario"/>
                  <select value={newMemberRole} onChange={e => setNewMemberRole(e.target.value as "editor" | "viewer")}>
                    <option value="editor">Editor</option><option value="viewer">Lector</option>
                  </select>
                  <button disabled={busy}>Agregar al equipo</button>
                </form>
              </div>}
              {selected && <div className="collab-panel">
                <span className="collab-eyebrow">PROYECTO</span><h2>{selected.name}</h2>
                <p>{selected.description || "Sin descripción."}</p>
                <div className="collab-section-title">Tareas <span>{tasks.length}</span></div>
                {tasks.map(t => <div className="collab-task" key={t.id}>
                  <span>{t.title}</span><select aria-label={"Estado de " + t.title} value={t.status}
                    disabled={busy} onChange={e => void perform(async () => {
                      await api.updateTask(workspaceId,t.id,e.target.value as ApiTask["status"]);
                      await refreshSelected();
                    })}>
                    <option value="todo">Pendiente</option><option value="doing">En curso</option>
                    <option value="blocked">Bloqueada</option><option value="done">Terminada</option>
                  </select>
                </div>)}
                <form className="collab-inline" onSubmit={e => {e.preventDefault();void perform(async () => {
                  await api.createTask(workspaceId,selected.id,taskName.trim());
                  setTaskName(""); await refreshSelected();
                });}}>
                  <input required value={taskName} onChange={e => setTaskName(e.target.value)} placeholder="Nueva tarea"/>
                  <button disabled={busy}>Agregar tarea</button>
                </form>
              </div>}
              {isOwner && selected && <div className="collab-panel">
                <h2>Compartir este proyecto</h2>
                <p>Dar acceso a este proyecto no comparte otras empresas, proyectos ni cotizaciones.</p>
                {shares.map(s => <div className="collab-task" key={s.subject}>
                  <span>{members.find(m => m.subject === s.subject)?.subject.slice(0,8) || s.subject.slice(0,8)}… · {s.role}</span>
                  <button className="collab-ghost" disabled={busy} onClick={() => void perform(async () => {
                    await api.unshareProject(workspaceId,selected.id,s.subject);await refreshSelected();
                  })}>Quitar acceso</button>
                </div>)}
                <form className="collab-inline" onSubmit={e => {e.preventDefault();void perform(async () => {
                  await api.shareProject(workspaceId,selected.id,shareSubject,shareRole);
                  setShareSubject("");await refreshSelected();
                });}}>
                  <select required value={shareSubject} onChange={e => setShareSubject(e.target.value)}>
                    <option value="">Seleccionar miembro</option>
                    {members.filter(m => m.role !== "owner" && !shares.some(s => s.subject === m.subject))
                      .map(m => <option key={m.subject} value={m.subject}>{m.subject.slice(0,8)}… · {m.role}</option>)}
                  </select>
                  <select value={shareRole} onChange={e => setShareRole(e.target.value as "editor" | "viewer")}>
                    <option value="editor">Puede editar</option><option value="viewer">Solo lectura</option>
                  </select>
                  <button disabled={busy}>Compartir</button>
                </form>
              </div>}
              {!selected && <div className="collab-panel collab-empty"><h2>Selecciona un proyecto</h2>
                <p>Abre un proyecto a la izquierda para administrar tareas y permisos.</p></div>}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
