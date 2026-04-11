import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type GrantRow = {
  id?: string | number;
  title?: string | null;
  description?: string | null;
  year?: number | null;
  grantee_name?: string | null;
  total_amount?: number | string | null;
  url?: string | null;
};

const PAGE_SIZE = 25;

export default function AllGrantsPage() {
  const [grants, setGrants] = useState<GrantRow[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchAllGrants() {
      setIsLoading(true);
      setError(null);

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Query principal (sem autenticação/sessão e sem filtro de usuário):
      // select * from grants limit PAGE_SIZE offset from
      const { data, error: queryError } = await supabase
        .from("grants")
        .select("*")
        .order("id", { ascending: true })
        .range(from, to);

      if (!isMounted) return;

      if (queryError) {
        setError("Não foi possível carregar os grants públicos agora. Tente novamente em instantes.");
        setGrants([]);
        setHasMore(false);
      } else {
        const rows = (data ?? []) as GrantRow[];
        setGrants(rows);
        setHasMore(rows.length === PAGE_SIZE);
      }

      setIsLoading(false);
    }

    fetchAllGrants();
    return () => {
      isMounted = false;
    };
  }, [page]);

  const rangeLabel = useMemo(() => {
    if (grants.length === 0) return "Sem registros";
    const from = (page - 1) * PAGE_SIZE + 1;
    const to = from + grants.length - 1;
    return `${from}–${to}`;
  }, [grants.length, page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Todos os Grants</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Listagem pública de registros da tabela <code>public.grants</code>, sem login.
        </p>
      </div>

      {isLoading && (
        <Card className="glass-panel">
          <CardContent className="py-8 text-sm text-muted-foreground">
            Carregando grants...
          </CardContent>
        </Card>
      )}

      {!isLoading && error && (
        <Card className="glass-panel border-destructive/40">
          <CardContent className="py-8 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {!isLoading && !error && grants.length === 0 && (
        <Card className="glass-panel">
          <CardContent className="py-8 text-sm text-muted-foreground">
            Nenhum grant encontrado na tabela pública.
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && grants.length > 0 && (
        <div className="space-y-3">
          {grants.map((grant, index) => (
            <Card key={String(grant.id ?? `${page}-${index}`)} className="glass-panel">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-heading">
                  {grant.title || "Sem título"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {grant.year && <Badge variant="secondary">Ano: {grant.year}</Badge>}
                  {grant.grantee_name && (
                    <Badge variant="outline">Organização: {grant.grantee_name}</Badge>
                  )}
                  {grant.total_amount !== null && grant.total_amount !== undefined && (
                    <Badge variant="outline">Valor: {String(grant.total_amount)}</Badge>
                  )}
                </div>
                {grant.description && (
                  <p className="text-muted-foreground line-clamp-3">{grant.description}</p>
                )}
                {grant.url && (
                  <a
                    href={grant.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline break-all"
                  >
                    {grant.url}
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Faixa exibida: {rangeLabel}</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={isLoading || page === 1}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            onClick={() => setPage((p) => p + 1)}
            disabled={isLoading || !hasMore}
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  );
}
