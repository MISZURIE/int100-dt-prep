import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export function Layout() {
  const { session, signOut } = useAuth();

  return (
    <>
      <header className="app-header">
        <div className="app-header__inner">
          <Link to="/" className="brand">
            <span className="brand__mark" aria-hidden="true" />
            INT100 Prep
          </Link>
          {session && (
            <nav className="nav" aria-label="เมนูหลัก">
              <NavLink to="/" end>
                ภาพรวม
              </NavLink>
              <NavLink to="/quiz/all">Quiz รวม</NavLink>
              <NavLink to="/history">ประวัติ</NavLink>
              <button type="button" className="btn btn--ghost" onClick={() => void signOut()}>
                ออกจากระบบ
              </button>
            </nav>
          )}
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  );
}
