"use client";

import { supabase } from "@/services/supabaseClient";
import React, { useEffect, useState } from "react";

function Provider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          console.log("Auth state changed, user logged in:", session.user);
          await createNewUser(session.user);
        } else {
          console.log("User logged out");
          setUser(null);
        }
      }
    );

    // On mount, check if user already logged in
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        console.log("User found on mount:", user);
        createNewUser(user);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const createNewUser = async (currentUser) => {
    console.log("Full user object:", currentUser);

    // Attempt to extract name and picture from multiple possible fields
    const name =
      currentUser.user_metadata?.name ||
      currentUser.user_metadata?.full_name ||
      currentUser.app_metadata?.provider_user_info?.name ||
      null;

    const picture =
      currentUser.user_metadata?.picture ||
      currentUser.app_metadata?.provider_user_info?.picture ||
      null;

    const email = currentUser.email || null;

    console.log("Parsed user info:", { name, email, picture });

    if (!email) {
      console.error("No email found on user object; aborting user creation");
      return;
    }

    // Check if user already exists in DB
    let { data: existingUsers, error: selectError } = await supabase
      .from("Users")
      .select("*")
      .eq("email", email);

    if (selectError) {
      console.error("Error querying existing users:", selectError);
      return;
    }

    if (!existingUsers || existingUsers.length === 0) {
      // Insert new user
      const { data: insertedUser, error: insertError } = await supabase
        .from("Users")
        .insert([
          {
            name,
            email,
            picture,
          },
        ])
        .select()
        .single();

      if (insertError) {
        console.error("Error inserting user:", insertError);
        return;
      }

      setUser(insertedUser);
      console.log("Inserted new user:", insertedUser);
    } else {
      setUser(existingUsers[0]);
      console.log("User already exists:", existingUsers[0]);
    }
  };

  return <>{children}</>;
}

export default Provider;
