import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

const TENANTS_ENDPOINT = "/api/tenants";
const TENANT_STORAGE_KEY = "tenantId";
const FALLBACK_TENANT_ID = "sunshine-academy";

export interface Tenant {
  id: string;
}

interface TenantsResponse {
  tenants: Tenant[];
}

interface TenantContextValue {
  tenantId: string;
  tenants: Tenant[];
  isLoading: boolean;
  error: string | null;
  setTenant: (id: string) => void;
  addTenant: (id: string) => Promise<Tenant>;
  refresh: () => Promise<void>;
}

const TenantContext = createContext<TenantContextValue | null>(null);

function readStoredTenantId(): string | null {
  try {
    return window.localStorage.getItem(TENANT_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredTenantId(id: string): void {
  try {
    window.localStorage.setItem(TENANT_STORAGE_KEY, id);
  } catch {
    // ignore storage failures (e.g., private mode)
  }
}

function resolveInitialTenantId(tenants: Tenant[], storedId: string | null): string {
  if (storedId && tenants.some((tenant) => tenant.id === storedId)) {
    return storedId;
  }

  if (tenants.length > 0) {
    return tenants[0].id;
  }

  return FALLBACK_TENANT_ID;
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantIdState] = useState<string>(() => {
    const stored = readStoredTenantId();
    return stored ?? FALLBACK_TENANT_ID;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenants = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(TENANTS_ENDPOINT);
      if (!response.ok) {
        throw new Error("Unable to load tenants.");
      }

      const payload = (await response.json()) as TenantsResponse;
      const nextTenants = Array.isArray(payload.tenants) ? payload.tenants : [];
      setTenants(nextTenants);

      setTenantIdState((current) => {
        if (nextTenants.some((tenant) => tenant.id === current)) {
          return current;
        }

        const next = resolveInitialTenantId(nextTenants, readStoredTenantId());
        writeStoredTenantId(next);
        return next;
      });
    } catch {
      setError("Could not load tenants.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTenants();
  }, [fetchTenants]);

  const setTenant = useCallback((id: string) => {
    setTenantIdState(id);
    writeStoredTenantId(id);
  }, []);

  const addTenant = useCallback(
    async (id: string): Promise<Tenant> => {
      const response = await fetch(TENANTS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: id })
      });

      if (!response.ok) {
        let message = "Failed to create tenant.";
        try {
          const payload = (await response.json()) as { error?: string };
          if (typeof payload.error === "string" && payload.error.trim().length > 0) {
            message = payload.error;
          }
        } catch {
          // use default message
        }
        throw new Error(message);
      }

      const created = (await response.json()) as Tenant;
      setTenants((prev) => {
        if (prev.some((tenant) => tenant.id === created.id)) {
          return prev;
        }
        return [...prev, created].sort((a, b) => a.id.localeCompare(b.id));
      });
      setTenant(created.id);
      return created;
    },
    [setTenant]
  );

  const value = useMemo<TenantContextValue>(
    () => ({
      tenantId,
      tenants,
      isLoading,
      error,
      setTenant,
      addTenant,
      refresh: fetchTenants
    }),
    [tenantId, tenants, isLoading, error, setTenant, addTenant, fetchTenants]
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenantContext(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error("useTenantContext must be used within a TenantProvider");
  }
  return ctx;
}

export function useTenant(): { tenantId: string; setTenant: (id: string) => void } {
  const { tenantId, setTenant } = useTenantContext();
  return { tenantId, setTenant };
}

export function useTenants(): {
  tenants: Tenant[];
  isLoading: boolean;
  error: string | null;
  addTenant: (id: string) => Promise<Tenant>;
  refresh: () => Promise<void>;
} {
  const { tenants, isLoading, error, addTenant, refresh } = useTenantContext();
  return { tenants, isLoading, error, addTenant, refresh };
}
