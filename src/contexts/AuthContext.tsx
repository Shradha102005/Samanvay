import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    name: string,
    role: string,
    tenantId?: string
  ) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: string,
    tenantId?: string
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // No emailRedirectTo — instant account activation for the portal
        data: {
          name,
          role,
          tenant_id: tenantId,
        },
      },
    });

    if (!error && data.user) {
      // Create profile row immediately
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: data.user.id,
            email,
            name,
            role: role as any,
            tenant_id: tenantId || null,
          },
          { onConflict: "id" }
        );

      if (profileError) {
        console.warn("Profile creation warning:", profileError.message);
      }

      // Assign role in user_roles table
      if (tenantId) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: data.user.id, role: role as any, tenant_id: tenantId });

        if (roleError) {
          console.warn("Role assignment warning:", roleError.message);
        }
      }
    }

    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    try {
      // Use 'local' scope to prevent 403 errors when the session is already expired.
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) {
        console.warn("Supabase sign out warning:", error.message);
      }
    } catch (err) {
      console.error("Unexpected error during sign out:", err);
    } finally {
      setUser(null);
      setSession(null);
      const tenantSlug = window.location.pathname.split("/").filter(Boolean)[0];
      window.location.replace(tenantSlug ? `/${tenantSlug}` : "/");
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
