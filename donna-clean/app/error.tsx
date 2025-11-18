"use client";

export default function Error({ error }: { error: Error }) {
  console.error(error);
  return (
    <div>
      Something went wrong —{" "}
      <a href="/auth/login">
        Log in again
      </a>
    </div>
  );
}
