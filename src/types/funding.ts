export interface Organization {
  id: string;
  name: string;
  aliases: string[];
  type: 'ngo' | 'foundation' | 'government' | 'international' | 'other';
  country?: string;
  description?: string;
}

export interface Funding {
  id: string;
  organizationId: string;
  funderId: string;
  funderName: string;
  amount?: number;
  currency?: string;
  year?: number;
  description?: string;
  sourceUrl?: string;
  sourceName: string;
  confidence: 'confirmed' | 'inferred';
}

export interface Relation {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'shared_funder' | 'co_occurrence' | 'partnership' | 'shared_leader';
  description: string;
  confidence: 'confirmed' | 'inferred';
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'organization' | 'funder' | 'person';
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  type: 'funding' | 'partnership' | 'co_occurrence';
  label?: string;
}

export interface SearchResult {
  organization: Organization;
  fundings: Funding[];
  relations: Relation[];
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
  connections?: ConnectionInsight[];
}

export interface ConnectionInsight {
  message: string;
  type: 'shared_funder' | 'cluster' | 'pattern';
  relatedOrgs: string[];
}

export interface InvestigationState {
  searchHistory: string[];
  allNodes: GraphNode[];
  allEdges: GraphEdge[];
  allFundings: Funding[];
  allRelations: Relation[];
}
