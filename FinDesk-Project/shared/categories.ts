export interface Category {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly color: string;
}

export interface CategoryState {
  readonly version: 1;
  readonly categories: readonly Category[];
  readonly classifications: readonly {
    readonly movementId: string;
    readonly categoryId: string | null;
  }[];
}

export interface SaveCategory {
  readonly id: string | null;
  readonly name: string;
  readonly icon: string;
  readonly color: string;
}

export interface ClassifyMovement {
  readonly movementId: string;
  readonly categoryId: string | null;
}
