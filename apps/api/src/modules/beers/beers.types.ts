import { type BeerStatus } from "@bjcp-arena/contracts";

export interface StoredBeer {
  id: number;
  competitionId: number;
  entryNumber: number;
  realName: string;
  producer: string;
  bjcpCategoryCode: string;
  bjcpCategoryName: string;
  bjcpSubcategoryCode: string;
  bjcpSubcategoryName: string;
  description: string;
  status: BeerStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStoredBeerInput {
  competitionId: number;
  entryNumber: number;
  realName: string;
  producer: string;
  bjcpCategoryCode: string;
  bjcpCategoryName: string;
  bjcpSubcategoryCode: string;
  bjcpSubcategoryName: string;
  description: string;
  status: BeerStatus;
}

export interface UpdateStoredBeerInput {
  realName?: string;
  producer?: string;
  bjcpCategoryCode?: string;
  bjcpCategoryName?: string;
  bjcpSubcategoryCode?: string;
  bjcpSubcategoryName?: string;
  description?: string;
}
