import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import {
  Warehouse,
  ClipboardCheck,
  PackageCheck,
  Truck,
  Box,
  ArrowRightLeft,
  FileText,
  Database
} from "lucide-react";

const dashboardCards = [
  {
    title: "Warehouse Status",
    icon: Warehouse,
    href: "/warehouse-status",
    color: "text-blue-500",
  },
  {
    title: "Survey",
    icon: ClipboardCheck,
    href: "/surveys",
    color: "text-green-500",
  },
  {
    title: "Inward",
    icon: PackageCheck,
    href: "/inward",
    color: "text-yellow-500",
  },
  {
    title: "Release Order",
    icon: ArrowRightLeft,
    href: "/ro",
    color: "text-purple-500",
  },
  {
    title: "Delivery Order",
    icon: Truck,
    href: "/delivery-order",
    color: "text-pink-500",
  },
  {
    title: "Outward",
    icon: Box,
    href: "/outward",
    color: "text-orange-500",
  },
  {
    title: "Reports",
    icon: FileText,
    href: "/reports",
    color: "text-red-500",
  },
  {
    title: "Master Data",
    icon: Database,
    href: "/master-data",
    color: "text-indigo-500",
  },
];

export function DashboardCards() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {dashboardCards.map((card) => {
        const Icon = card.icon;
        return (
          <Link key={card.title} href={card.href}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 flex flex-col items-center justify-center space-y-2">
                <Icon className={`w-8 h-8 ${card.color}`} />
                <span className="text-sm font-medium text-center">
                  {card.title}
                </span>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
