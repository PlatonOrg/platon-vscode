export interface Resource {
  /**
   * Unique identifier of the resource.
   */
  readonly id: string;

  /**
   * Date on which the resource has been created.
   */
  readonly createdAt: Date;

  /**
   * Last date on which the resource has been updated.
   * @remarks
   * - External events may trigger this field update like update of resource files.
   */
  readonly updatedAt: Date;

  /**
   * Display name of the resource.
   */
  readonly name: string;

  /**
   * Unique string representing an alias for accessing this resource files.
   */
  readonly code?: string;

  /**
   * Human readable
   */
  readonly desc?: string;

  /**
   * Types of the resource.
   */
  readonly type: ResourceTypes;

  /**
   * Value indicating whether this resource is inside of personal circle (for non circle resources) or is a personal cirlcle.
   */
  readonly personal: boolean;

  /**
   * Current usability status of the resource used
   */
  readonly status: ResourceStatus;

  /**
   * List of levels metadata associated to the resource.
   */
  readonly levels: Level[];

  /**
   * List of topics metadata associated to the resource.
   */
  readonly topics: Topic[];

  /**
   * Identifier of the resource's creator.
   */
  readonly ownerId: string;

  /**
   * Identifier of the circle the resource belongs to if any.
   */
  readonly parentId?: string;

  /**
   * Identifier of the exercise from which this resource (assuming that it's an exercise type) is from.
   */
  readonly templateId?: string;

  /**
   * Version of the exercise from which this resource (assuming that it's an exercise type) is from.
   */
  readonly templateVersion?: string;

  /**
   * Value indicating whether this resource is publicly previewable.
   */
  readonly publicPreview?: boolean;

  // Expandable fields

  /**
   * List of permissions the user requesting the resource has on it.
   * @remarks
   * - `Expandable` (default in POST, PATCH AND SINGLE GET queries)
   */
  readonly permissions?: ResourcePermissions;

  /**
   * The circle the resource belongs to if any.
   * @remarks
   * - `Expandable`
   */
  readonly parent?: Resource;

  /**
   * Some useful metadata informations about the resource.
   * @remarks
   * - `Expandable`
   */
  readonly metadata?: ResourceMeta;

  /**
   * The template from which the resource is from if any.
   * @remarks
   * - `Expandable`
   */
  readonly template?: Resource;

  /**
   * Some statistics about the resource.
   * @remarks
   * - `Expandable`
   */
  readonly statistic?: ResourceStatistic;
}

export interface CircleResourceStatistic {
  readonly children: number;
  readonly circles: number;
  readonly exercises: number;
  readonly activities: number;
  readonly ready: number;
  readonly deprecated: number;
  readonly bugged: number;
  readonly not_tested: number;
  readonly draft: number;
}

export interface ActivityResourceStatistic {
  readonly attemptCount: number;
  readonly averageScore: number;
}

export interface ExerciseResourceStatistic {
  readonly attemptCount: number;
  readonly averageScore: number;
  readonly references?: {
    readonly total: number;
    readonly activity: number;
    readonly template: number;
  };
}

export interface ResourceStatistic {
  readonly score: number;
  readonly members: number;
  readonly watchers: number;

  readonly circle?: CircleResourceStatistic;
  readonly activity?: ActivityResourceStatistic;
  readonly exercise?: ExerciseResourceStatistic;
}

export enum ResourceTypes {
  CIRCLE = "CIRCLE",
  EXERCISE = "EXERCISE",
  ACTIVITY = "ACTIVITY",
}

export enum ResourceStatus {
  READY = "READY",
  DEPRECATED = "DEPRECATED",
  BUGGED = "BUGGED",
  NOT_TESTED = "NOT_TESTED",
  DRAFT = "DRAFT",
}

export interface Level {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  name: string;
  existing?: boolean;
}

export interface Topic {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  name: string;
  existing?: boolean;
}

export interface ResourcePermissions {
  /**
   * Indicates if the user can read the resource.
   */
  readonly read: boolean;

  /**
   * Indicates if the user can write the resource.
   */
  readonly write: boolean;

  /**
   * Indicates if the user is a member of the resource.
   */
  readonly member: boolean;

  /**
   * Indicates if the user is a watcher of the resource.
   */
  readonly watcher: boolean;

  /**
   * Indicates if the user is waiting for being accepted as a member of the resource.
   */
  readonly waiting: boolean;
}
export interface FileVersion {
  tag: string;
  tagger: {
    name: string;
    email: string;
  };
  message: string;
  createdAt: string;
}

export interface CircleResourceMeta {
  versions: FileVersion[];
}

export interface ActivityResourceMeta {
  settings: any;
  versions: FileVersion[];
}

export interface ExerciseResourceMeta {
  configurable: boolean;
  config?: any;
  versions: FileVersion[];
}

export type ResourceMeta =
  | CircleResourceMeta
  | ActivityResourceMeta
  | ExerciseResourceMeta;
