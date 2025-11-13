import { supabase } from "@/integrations/supabase/client";

/**
 * Closes jobs that have passed their close date
 */
export const closeExpiredJobs = async (userId?: string) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        let query = supabase
            .from("jobs")
            .update({ status: 'closed', updated_at: new Date().toISOString() })
            .eq("status", "active")
            .not("close_date", "is", null)
            .lt("close_date", today);

        if (userId) {
            query = query.eq("user_id", userId);
        }

        const { data, error } = await query;

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error("Error closing expired jobs:", error);
        return { success: false, error };
    }
};

/**
 * Checks if a job should be automatically closed
 */
export const shouldCloseJob = (closeDate: string | null): boolean => {
    if (!closeDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const close = new Date(closeDate);
    close.setHours(0, 0, 0, 0);

    return close < today;
};