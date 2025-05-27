export default function Footer() {
  return (
    <footer className="border-t border-border py-4 px-6 bg-card">
      <div className="text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} AgroGreen Warehousing. All rights reserved.
      </div>
    </footer>
  );
}