import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://kwgmtjtncoorgpspgvfi.supabase.co';
const supabaseKey = 'sb_publishable_3AYIglbz1V7rDVAQJ4kP6w_N9Bk0rJI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: courses } = await supabase.from('courses').select('*').order('created_at', { ascending: false }).limit(3);
  console.log("RECENT COURSES:");
  console.log(courses);

  if (courses && courses.length > 0) {
    const { data: lessons } = await supabase.from('lessons').select('*').eq('course_id', courses[0].id);
    console.log(`\nLESSONS FOR LATEST COURSE (${courses[0].id}):`);
    console.log(`Count: ${lessons ? lessons.length : 0}`);
    if (lessons) {
        lessons.forEach(l => console.log(`- ${l.title}`));
    }
  }
}
check();
