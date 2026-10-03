import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import "./CallProfileCard.css";

// ASSUMED profiles columns: id, name, avatar_url, age (optional), bio (optional). Adjust the select() below.
type Profile = { id: string; name: string | null; avatar_url: string | null; age?: number | null; bio?: string | null };

function useProfile(supabase: SupabaseClient, userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    supabase.from("profiles").select("id,name,avatar_url,age,bio").eq("id", userId).maybeSingle()
      .then(({ data }) => alive && setProfile(data as Profile | null));
    return () => { alive = false; };
  }, [supabase, userId]);
  return profile;
}

type Props = {
  supabase: SupabaseClient;
  otherUserId: string;                 // callee when you're calling, caller when you're receiving
  mode: "calling" | "incoming";
  callType?: "video" | "audio";
  onHangup?: () => void;               // calling: cancel   | incoming: decline
  onAnswer?: () => void;               // incoming only
};

/** Render this over your call screen while status is ringing/calling; unmount once the call connects. */
export default function CallProfileCard({ supabase, otherUserId, mode, callType = "video", onHangup, onAnswer }: Props) {
  const p = useProfile(supabase, otherUserId);
  const name = p?.name ?? "…";
  const label = mode === "calling" ? "Calling…" : `Incoming ${callType} call`;

  return (
    <div className="cpc-backdrop">
      <div className="cpc-card">
        <div className="cpc-avatar-wrap">
          <span className="cpc-ring" /><span className="cpc-ring cpc-ring-2" />
          {p?.avatar_url
            ? <img className="cpc-avatar" src={p.avatar_url} alt={name} />
            : <div className="cpc-avatar cpc-fallback">{name.charAt(0).toUpperCase()}</div>}
        </div>
        <h2 className="cpc-name">{name}{p?.age ? `, ${p.age}` : ""}</h2>
        <p className="cpc-status">{label}</p>
        {p?.bio && <p className="cpc-bio">{p.bio}</p>}

        <div className="cpc-actions">
          <button className="cpc-btn cpc-red" onClick={onHangup} aria-label={mode === "calling" ? "Cancel call" : "Decline"}>✕</button>
          {mode === "incoming" && (
            <button className="cpc-btn cpc-green" onClick={onAnswer} aria-label="Answer">✓</button>
          )}
        </div>
      </div>
    </div>
  );
}
