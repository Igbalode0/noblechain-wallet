import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://hslfrufymvfwluctmsdg.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)
<script>
  async function testConnection() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (error) {
      console.error("Supabase error:", error.message);
    } else {
      console.log("Supabase connected. Sample data:", data);
    }
  }

  testConnection();
</script>