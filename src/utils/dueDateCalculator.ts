import dbConnection from '../db/connection';
import { BusinessPlanDetailWithRelations } from '../types';
import logger from './logger';

interface PrerequisiteMap {
  [s_id: number]: number[]; // step_id -> array of prerequisite step_ids
}

interface StepData {
  bpd_id: number;
  s_id: number;
  t_days: number;
  started_at?: Date | null;
  status?: number;
}

interface DueDateCache {
  [s_id: number]: Date | null;
}

interface DurationCache {
  [s_id: number]: number | null;
}

/**
 * Calculates due dates for business plan details based on prerequisite relationships.
 * Prerequisites are defined at the project type level (pts_detail) but only steps
 * that exist in the business plan are considered.
 */
export class DueDateCalculator {
  private prerequisiteMap: PrerequisiteMap = {};
  private stepDataMap: Map<number, StepData> = new Map();
  private projectStartDate: Date | null = null;
  private dueDateCache: DueDateCache = {};
  private durationCache: DurationCache = {};
  private visiting: Set<number> = new Set(); // For cycle detection
  private visitingDuration: Set<number> = new Set(); // For cycle detection in duration calculation

  /**
   * Initialize the calculator with business plan details and fetch prerequisites
   */
  static async initialize(
    businessPlanDetails: BusinessPlanDetailWithRelations[],
    ptype_id: number,
    projectStartDate: Date | null
  ): Promise<DueDateCalculator> {
    const calculator = new DueDateCalculator();
    calculator.projectStartDate = projectStartDate;

    // Build step data map from business plan details
    businessPlanDetails.forEach((detail) => {
      calculator.stepDataMap.set(detail.s_id, {
        bpd_id: detail.bpd_id,
        s_id: detail.s_id,
        t_days: detail.t_days,
        started_at: detail.started_at ? new Date(detail.started_at) : null,
        status: detail.status,
      });
    });

    // Fetch prerequisites from database
    await calculator.loadPrerequisites(ptype_id, businessPlanDetails);

    return calculator;
  }

  /**
   * Load prerequisites from pts_detail table, filtered by steps that exist in business plan
   */
  private async loadPrerequisites(
    ptype_id: number,
    businessPlanDetails: BusinessPlanDetailWithRelations[]
  ): Promise<void> {
    const client = await dbConnection.getConnection();
    try {
      // Get all step IDs that exist in the business plan
      const businessPlanStepIds = new Set(
        businessPlanDetails.map((detail) => detail.s_id)
      );

      // Fetch all project_types_detail rows for this project type
      const ptdQuery = `
        SELECT id, s_id, t_days
        FROM project_types_detail
        WHERE ptype_id = $1
      `;
      const ptdResult = await client.query(ptdQuery, [ptype_id]);

      // Build a map of s_id -> ptd_id for quick lookup
      const sIdToPtdId = new Map<number, number>();
      ptdResult.rows.forEach((row: any) => {
        sIdToPtdId.set(row.s_id, row.id);
      });

      // Fetch all pts_detail prerequisites for these project type details
      if (ptdResult.rows.length > 0) {
        const ptdIds = ptdResult.rows.map((row: any) => row.id);
        const placeholders = ptdIds.map((_, i) => `$${i + 1}`).join(',');
        const ptsQuery = `
          SELECT ptd_id, step_id
          FROM pts_detail
          WHERE ptd_id IN (${placeholders})
        `;
        const ptsResult = await client.query(ptsQuery, ptdIds);

        // Build prerequisite map: s_id -> [prerequisite_step_ids]
        // Only include prerequisites that exist in the business plan
        ptdResult.rows.forEach((ptdRow: any) => {
          const s_id = ptdRow.s_id;
          if (businessPlanStepIds.has(s_id)) {
            // Find prerequisites for this project type detail
            const prerequisites = ptsResult.rows
              .filter((ptsRow: any) => ptsRow.ptd_id === ptdRow.id)
              .map((ptsRow: any) => ptsRow.step_id)
              .filter((prereqStepId: number) =>
                businessPlanStepIds.has(prereqStepId)
              );

            if (prerequisites.length > 0) {
              this.prerequisiteMap[s_id] = prerequisites;
            }
          }
        });
      }
    } catch (error) {
      logger.error('Error loading prerequisites for due date calculation', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ptype_id,
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Calculate due date for a specific step
   * This method accounts for:
   * - Steps that have already started (uses started_at as base)
   * - Steps that are completed (returns their completion date)
   * - Prerequisite dependencies
   */
  calculateDueDate(s_id: number): Date | null {
    // If project start date is null, return null
    if (!this.projectStartDate) {
      return null;
    }

    // Check cache first
    if (this.dueDateCache.hasOwnProperty(s_id)) {
      return this.dueDateCache[s_id];
    }

    // Cycle detection
    if (this.visiting.has(s_id)) {
      logger.warn(
        `Circular dependency detected for step ${s_id}, returning null for due date`
      );
      this.dueDateCache[s_id] = null;
      return null;
    }

    // Get step data
    const stepData = this.stepDataMap.get(s_id);
    if (!stepData) {
      // Step doesn't exist in business plan, return null
      this.dueDateCache[s_id] = null;
      return null;
    }

    // If step is completed (status = 2), we still need to calculate its due date
    // for prerequisite purposes, but we can use its completion date if available
    // For now, we'll calculate normally as it helps with prerequisite calculations

    // Mark as visiting
    this.visiting.add(s_id);

    try {
      // If step has started, use started_at as the base date
      // This means the step is already in progress
      let baseDate: Date;
      if (stepData.started_at) {
        baseDate = new Date(stepData.started_at);
        baseDate.setHours(0, 0, 0, 0);
      } else {
        // Step hasn't started yet, need to check prerequisites
        const prerequisites = this.prerequisiteMap[s_id] || [];

        if (prerequisites.length === 0) {
          // Base case: no prerequisites, use project start date
          baseDate = new Date(this.projectStartDate!);
        } else {
          // Recursive case: has prerequisites
          // Calculate due dates for all prerequisites and take the maximum
          let maxPrerequisiteDueDate: Date | null = null;

          for (const prereqSId of prerequisites) {
            const prereqDueDate = this.calculateDueDate(prereqSId);
            if (prereqDueDate) {
              if (
                !maxPrerequisiteDueDate ||
                prereqDueDate > maxPrerequisiteDueDate
              ) {
                maxPrerequisiteDueDate = prereqDueDate;
              }
            }
          }

          // If no valid prerequisite due dates found, use project start date
          baseDate = maxPrerequisiteDueDate || this.projectStartDate!;
        }
      }

      // Calculate due date: base date + t_days
      const dueDate = new Date(baseDate);
      dueDate.setDate(dueDate.getDate() + stepData.t_days);

      this.dueDateCache[s_id] = dueDate;
      return dueDate;
    } finally {
      // Remove from visiting set
      this.visiting.delete(s_id);
    }
  }

  /**
   * Calculate due dates for all business plan details
   */
  calculateAllDueDates(
    businessPlanDetails: BusinessPlanDetailWithRelations[]
  ): BusinessPlanDetailWithRelations[] {
    return businessPlanDetails.map((detail) => {
      const dueDate = this.calculateDueDate(detail.s_id);
      return {
        ...detail,
        due_date: dueDate,
      };
    });
  }

  /**
   * Calculate critical path duration in days (without needing a start date)
   * This finds the longest path through the prerequisite graph by summing t_days
   * Returns the maximum cumulative days from any starting step to any ending step
   */
  calculateCriticalPathDuration(): number | null {
    // Get all step IDs
    const allStepIds = Array.from(this.stepDataMap.keys());
    
    if (allStepIds.length === 0) {
      return null;
    }

    // Calculate duration for each step and find the maximum
    let maxDuration = 0;
    for (const s_id of allStepIds) {
      const duration = this.calculateStepDuration(s_id);
      if (duration !== null && duration > maxDuration) {
        maxDuration = duration;
      }
    }

    return maxDuration > 0 ? maxDuration : null;
  }

  /**
   * Calculate the cumulative duration (in days) for a step including all its prerequisites
   * This is the total days needed from the earliest prerequisite to complete this step
   */
  private calculateStepDuration(s_id: number): number | null {
    // Check cache first
    if (this.durationCache.hasOwnProperty(s_id)) {
      return this.durationCache[s_id];
    }

    // Cycle detection
    if (this.visitingDuration.has(s_id)) {
      logger.warn(
        `Circular dependency detected for step ${s_id} in duration calculation, returning null`
      );
      this.durationCache[s_id] = null;
      return null;
    }

    // Get step data
    const stepData = this.stepDataMap.get(s_id);
    if (!stepData) {
      this.durationCache[s_id] = null;
      return null;
    }

    // Mark as visiting
    this.visitingDuration.add(s_id);

    try {
      // Get prerequisites for this step
      const prerequisites = this.prerequisiteMap[s_id] || [];

      if (prerequisites.length === 0) {
        // Base case: no prerequisites, duration is just this step's t_days
        this.durationCache[s_id] = stepData.t_days;
        return stepData.t_days;
      }

      // Recursive case: has prerequisites
      // Find the maximum duration among all prerequisite paths
      let maxPrerequisiteDuration = 0;

      for (const prereqSId of prerequisites) {
        const prereqDuration = this.calculateStepDuration(prereqSId);
        if (prereqDuration !== null && prereqDuration > maxPrerequisiteDuration) {
          maxPrerequisiteDuration = prereqDuration;
        }
      }

      // Total duration = max prerequisite duration + this step's t_days
      const totalDuration = maxPrerequisiteDuration + stepData.t_days;
      this.durationCache[s_id] = totalDuration;
      return totalDuration;
    } finally {
      // Remove from visiting set
      this.visitingDuration.delete(s_id);
    }
  }
}

