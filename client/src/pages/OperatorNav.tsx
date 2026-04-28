import type { OperatorView } from "./operatorViews";

interface OperatorNavProps {
  activeView: OperatorView;
}

interface NavItem {
  view: OperatorView;
  label: string;
  href: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { view: "handbook", label: "Handbook", href: "/operator?view=handbook", icon: "📘" },
  { view: "questionLog", label: "Question Log", href: "/operator?view=questionLog", icon: "📝" },
  { view: "formBuilder", label: "Intake Form", href: "/admin/form-builder", icon: "🧩" }
];

export function OperatorNav({ activeView }: OperatorNavProps) {
  return (
    <nav className="operator-nav" aria-label="Operator sections">
      <a className="operator-nav-brand" href="/" aria-label="Sunshine Academy home">
        <span className="operator-nav-brand-mark" aria-hidden="true">☀️</span>
        <span className="operator-nav-brand-text">Sunshine Academy</span>
      </a>

      <div className="operator-nav-tabs" role="tablist" aria-label="Operator views">
        {NAV_ITEMS.map((item) => {
          const isActive = item.view === activeView;
          return (
            <a
              key={item.view}
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "page" : undefined}
              className={`operator-nav-tab${isActive ? " active" : ""}`}
              href={item.href}
            >
              <span aria-hidden="true" className="operator-nav-tab-icon">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          );
        })}
      </div>

      <a className="operator-nav-parent-link" href="/chat">
        <span aria-hidden="true">💬</span>
        <span>View as Parent</span>
      </a>
    </nav>
  );
}
