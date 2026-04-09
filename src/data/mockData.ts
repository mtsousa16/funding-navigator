import { Organization, Funding, Relation, GraphNode, GraphEdge } from '@/types/funding';

export const mockOrganizations: Organization[] = [
  { id: 'org-1', name: 'ANTRA', aliases: ['Associação Nacional de Travestis e Transexuais'], type: 'ngo', country: 'Brasil', description: 'Articulação nacional de pessoas trans' },
  { id: 'org-2', name: 'ABGLT', aliases: ['Associação Brasileira de Lésbicas, Gays, Bissexuais, Travestis e Transexuais'], type: 'ngo', country: 'Brasil' },
  { id: 'org-3', name: 'Criola', aliases: [], type: 'ngo', country: 'Brasil', description: 'Organização de mulheres negras' },
  { id: 'org-4', name: 'Geledés', aliases: ['Geledés Instituto da Mulher Negra'], type: 'ngo', country: 'Brasil' },
  { id: 'org-5', name: 'IBASE', aliases: ['Instituto Brasileiro de Análises Sociais e Econômicas'], type: 'ngo', country: 'Brasil' },
  { id: 'org-6', name: 'Conectas', aliases: ['Conectas Direitos Humanos'], type: 'ngo', country: 'Brasil' },
  { id: 'org-7', name: 'Instituto Socioambiental', aliases: ['ISA'], type: 'ngo', country: 'Brasil' },
  { id: 'org-8', name: 'Artigo 19', aliases: ['Article 19 Brasil'], type: 'ngo', country: 'Brasil' },
  { id: 'org-9', name: 'Terra de Direitos', aliases: [], type: 'ngo', country: 'Brasil' },
  { id: 'org-10', name: 'ActionAid Brasil', aliases: ['ActionAid'], type: 'international', country: 'Brasil' },
];

export const mockFunders: Organization[] = [
  { id: 'funder-1', name: 'Ford Foundation', aliases: ['Fundação Ford'], type: 'foundation', country: 'EUA' },
  { id: 'funder-2', name: 'Open Society Foundations', aliases: ['OSF', 'Soros Foundation'], type: 'foundation', country: 'EUA' },
  { id: 'funder-3', name: 'Fundação Kellogg', aliases: ['W.K. Kellogg Foundation'], type: 'foundation', country: 'EUA' },
  { id: 'funder-4', name: 'Oxfam', aliases: ['Oxfam International'], type: 'international', country: 'Reino Unido' },
  { id: 'funder-5', name: 'Heinrich Böll Stiftung', aliases: ['Fundação Heinrich Böll'], type: 'foundation', country: 'Alemanha' },
  { id: 'funder-6', name: 'Fundo Brasil de Direitos Humanos', aliases: ['Fundo Brasil'], type: 'foundation', country: 'Brasil' },
  { id: 'funder-7', name: 'Sigrid Rausing Trust', aliases: [], type: 'foundation', country: 'Reino Unido' },
  { id: 'funder-8', name: 'Norwegian Agency for Development', aliases: ['NORAD'], type: 'government', country: 'Noruega' },
  { id: 'funder-9', name: 'European Commission', aliases: ['EU', 'Comissão Europeia'], type: 'government', country: 'UE' },
  { id: 'funder-10', name: 'Fundação Avina', aliases: ['Avina'], type: 'foundation', country: 'Suíça' },
];

export const mockFundings: Funding[] = [
  { id: 'f-1', organizationId: 'org-1', funderId: 'funder-2', funderName: 'Open Society Foundations', amount: 250000, currency: 'USD', year: 2022, sourceName: 'OSF Grants Database', sourceUrl: 'https://opensocietyfoundations.org/grants', confidence: 'confirmed' },
  { id: 'f-2', organizationId: 'org-1', funderId: 'funder-1', funderName: 'Ford Foundation', amount: 180000, currency: 'USD', year: 2021, sourceName: 'Ford Foundation Grants', sourceUrl: 'https://fordfoundation.org/grants', confidence: 'confirmed' },
  { id: 'f-3', organizationId: 'org-1', funderId: 'funder-6', funderName: 'Fundo Brasil de Direitos Humanos', amount: 75000, currency: 'BRL', year: 2023, sourceName: 'Fundo Brasil', sourceUrl: 'https://fundobrasil.org.br', confidence: 'confirmed' },
  { id: 'f-4', organizationId: 'org-2', funderId: 'funder-2', funderName: 'Open Society Foundations', amount: 300000, currency: 'USD', year: 2022, sourceName: 'OSF Grants Database', sourceUrl: 'https://opensocietyfoundations.org/grants', confidence: 'confirmed' },
  { id: 'f-5', organizationId: 'org-2', funderId: 'funder-1', funderName: 'Ford Foundation', amount: 200000, currency: 'USD', year: 2020, sourceName: 'Ford Foundation Grants', confidence: 'confirmed' },
  { id: 'f-6', organizationId: 'org-3', funderId: 'funder-1', funderName: 'Ford Foundation', amount: 350000, currency: 'USD', year: 2023, sourceName: 'Ford Foundation Grants', confidence: 'confirmed' },
  { id: 'f-7', organizationId: 'org-3', funderId: 'funder-3', funderName: 'Fundação Kellogg', amount: 150000, currency: 'USD', year: 2022, sourceName: 'Kellogg Foundation', confidence: 'confirmed' },
  { id: 'f-8', organizationId: 'org-4', funderId: 'funder-1', funderName: 'Ford Foundation', amount: 400000, currency: 'USD', year: 2023, sourceName: 'Ford Foundation Grants', confidence: 'confirmed' },
  { id: 'f-9', organizationId: 'org-4', funderId: 'funder-2', funderName: 'Open Society Foundations', amount: 275000, currency: 'USD', year: 2021, sourceName: 'OSF Grants Database', confidence: 'confirmed' },
  { id: 'f-10', organizationId: 'org-5', funderId: 'funder-1', funderName: 'Ford Foundation', amount: 500000, currency: 'USD', year: 2020, sourceName: 'Ford Foundation Grants', confidence: 'confirmed' },
  { id: 'f-11', organizationId: 'org-5', funderId: 'funder-4', funderName: 'Oxfam', amount: 120000, currency: 'EUR', year: 2022, sourceName: 'Oxfam Reports', confidence: 'confirmed' },
  { id: 'f-12', organizationId: 'org-6', funderId: 'funder-2', funderName: 'Open Society Foundations', amount: 450000, currency: 'USD', year: 2023, sourceName: 'OSF Grants Database', confidence: 'confirmed' },
  { id: 'f-13', organizationId: 'org-6', funderId: 'funder-7', funderName: 'Sigrid Rausing Trust', amount: 200000, currency: 'GBP', year: 2022, sourceName: 'Sigrid Rausing Trust', confidence: 'confirmed' },
  { id: 'f-14', organizationId: 'org-6', funderId: 'funder-5', funderName: 'Heinrich Böll Stiftung', amount: 100000, currency: 'EUR', year: 2021, sourceName: 'HBS Reports', confidence: 'confirmed' },
  { id: 'f-15', organizationId: 'org-7', funderId: 'funder-8', funderName: 'Norwegian Agency for Development', amount: 600000, currency: 'USD', year: 2023, sourceName: 'NORAD Database', confidence: 'confirmed' },
  { id: 'f-16', organizationId: 'org-7', funderId: 'funder-9', funderName: 'European Commission', amount: 350000, currency: 'EUR', year: 2022, sourceName: 'EU Funding Portal', confidence: 'confirmed' },
  { id: 'f-17', organizationId: 'org-7', funderId: 'funder-10', funderName: 'Fundação Avina', amount: 200000, currency: 'USD', year: 2021, sourceName: 'Avina Foundation', confidence: 'confirmed' },
  { id: 'f-18', organizationId: 'org-8', funderId: 'funder-2', funderName: 'Open Society Foundations', amount: 350000, currency: 'USD', year: 2023, sourceName: 'OSF Grants Database', confidence: 'confirmed' },
  { id: 'f-19', organizationId: 'org-8', funderId: 'funder-9', funderName: 'European Commission', amount: 250000, currency: 'EUR', year: 2022, sourceName: 'EU Funding Portal', confidence: 'confirmed' },
  { id: 'f-20', organizationId: 'org-9', funderId: 'funder-6', funderName: 'Fundo Brasil de Direitos Humanos', amount: 90000, currency: 'BRL', year: 2023, sourceName: 'Fundo Brasil', confidence: 'confirmed' },
  { id: 'f-21', organizationId: 'org-9', funderId: 'funder-5', funderName: 'Heinrich Böll Stiftung', amount: 130000, currency: 'EUR', year: 2022, sourceName: 'HBS Reports', confidence: 'confirmed' },
  { id: 'f-22', organizationId: 'org-10', funderId: 'funder-4', funderName: 'Oxfam', amount: 180000, currency: 'EUR', year: 2023, sourceName: 'Oxfam Reports', confidence: 'confirmed' },
  { id: 'f-23', organizationId: 'org-10', funderId: 'funder-8', funderName: 'Norwegian Agency for Development', amount: 400000, currency: 'USD', year: 2022, sourceName: 'NORAD Database', confidence: 'confirmed' },
];

export function getOrganizationById(id: string): Organization | undefined {
  return [...mockOrganizations, ...mockFunders].find(o => o.id === id);
}

export function searchOrganizations(query: string): Organization[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return mockOrganizations.filter(org =>
    org.name.toLowerCase().includes(q) ||
    org.aliases.some(a => a.toLowerCase().includes(q))
  );
}

export function getFundingsForOrg(orgId: string): Funding[] {
  return mockFundings.filter(f => f.organizationId === orgId);
}

export function getRelationsForOrg(orgId: string): Relation[] {
  const orgFundings = getFundingsForOrg(orgId);
  const funderIds = orgFundings.map(f => f.funderId);
  const relations: Relation[] = [];

  // Find orgs with shared funders
  mockOrganizations.forEach(otherOrg => {
    if (otherOrg.id === orgId) return;
    const otherFundings = getFundingsForOrg(otherOrg.id);
    const sharedFunders = otherFundings.filter(f => funderIds.includes(f.funderId));
    if (sharedFunders.length > 0) {
      relations.push({
        id: `rel-${orgId}-${otherOrg.id}`,
        sourceId: orgId,
        targetId: otherOrg.id,
        type: 'shared_funder',
        description: `Compartilha ${sharedFunders.length} financiador(es): ${sharedFunders.map(f => f.funderName).join(', ')}`,
        confidence: 'confirmed',
      });
    }
  });

  return relations;
}

export function buildGraphForOrg(orgId: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const org = getOrganizationById(orgId);
  if (!org) return { nodes: [], edges: [] };

  const nodes: GraphNode[] = [{ id: org.id, label: org.name, type: 'organization' }];
  const edges: GraphEdge[] = [];
  const addedNodeIds = new Set([org.id]);

  const fundings = getFundingsForOrg(orgId);
  fundings.forEach(f => {
    if (!addedNodeIds.has(f.funderId)) {
      nodes.push({ id: f.funderId, label: f.funderName, type: 'funder' });
      addedNodeIds.add(f.funderId);
    }
    edges.push({
      id: `edge-${f.id}`,
      source: f.funderId,
      target: orgId,
      type: 'funding',
      label: f.amount ? `${f.currency} ${f.amount.toLocaleString()}` : undefined,
    });
  });

  const relations = getRelationsForOrg(orgId);
  relations.forEach(r => {
    const targetOrg = getOrganizationById(r.targetId);
    if (targetOrg && !addedNodeIds.has(r.targetId)) {
      nodes.push({ id: r.targetId, label: targetOrg.name, type: 'organization' });
      addedNodeIds.add(r.targetId);
    }
    edges.push({
      id: `edge-${r.id}`,
      source: orgId,
      target: r.targetId,
      type: 'co_occurrence',
    });
  });

  return { nodes, edges };
}

export function getAllOrganizationNames(): string[] {
  return mockOrganizations.map(o => o.name);
}
