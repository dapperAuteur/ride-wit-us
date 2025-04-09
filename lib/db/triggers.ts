import { executeSQL } from "./neon"

// Function to create a trigger that updates the updated_at timestamp
export async function createUpdatedAtTrigger() {
  try {
    // First create the function that will be called by the trigger
    const createFunctionResult = await executeSQL(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `)

    if (!createFunctionResult.success) {
      console.error("Failed to create update_updated_at_column function:", createFunctionResult.error)
      return false
    }

    // Create triggers for each table
    const tables = ["users", "activities", "pricing_tiers"]

    for (const table of tables) {
      const createTriggerResult = await executeSQL(`
        DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
        CREATE TRIGGER update_${table}_updated_at
        BEFORE UPDATE ON ${table}
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
      `)

      if (!createTriggerResult.success) {
        console.error(`Failed to create trigger for ${table}:`, createTriggerResult.error)
        return false
      }
    }

    return true
  } catch (error) {
    console.error("Error creating updated_at triggers:", error)
    return false
  }
}
