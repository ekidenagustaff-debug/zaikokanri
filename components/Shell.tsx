import Nav from "./Nav";

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Nav />
      <main className="ml-52 flex-1 p-6 max-w-6xl">{children}</main>
    </div>
  );
}
