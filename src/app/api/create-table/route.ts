import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    // Use service role to create tables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Create the chat_sessions table
    const { error } = await supabase.rpc('create_chat_sessions_table')

    if (error) {
      console.error('Table creation error:', error)
      
      // If the RPC function doesn't exist, try using raw SQL
      const { error: sqlError } = await supabase
        .from('_sql')
        .insert({
          query: `
            CREATE TABLE IF NOT EXISTS chat_sessions (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              user_id UUID NOT NULL,
              messages JSONB DEFAULT '[]'::jsonb,
              preferences_extracted BOOLEAN DEFAULT false,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
            );
            
            ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
            
            CREATE POLICY IF NOT EXISTS "Users can manage own chat sessions" 
            ON chat_sessions FOR ALL USING (auth.uid() = user_id);
          `
        })

      if (sqlError) {
        return NextResponse.json({
          success: false,
          error: 'Failed to create table',
          details: sqlError,
          instructions: 'Please create the table manually in Supabase dashboard using the SQL from database_setup.sql'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Chat sessions table created successfully'
    })

  } catch (error) {
    console.error('Create table error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        instructions: 'Please create the table manually in Supabase dashboard using the SQL from database_setup.sql'
      },
      { status: 500 }
    )
  }
} 