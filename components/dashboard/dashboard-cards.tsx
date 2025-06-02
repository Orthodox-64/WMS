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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-4">
      {dashboardCards.map((card) => {
        const Icon = card.icon;
        return (
          <Link key={card.title} href={card.href} className="w-full max-w-[250px] mx-auto">
            <Card className="hover:shadow-md transition-all duration-300 cursor-pointer bg-gray-100 rounded-lg border border-gray-200">
              <CardContent className="p-4 flex flex-col items-center justify-center space-y-2">
                <div className="p-2.5 rounded-md bg-white">
                  <Icon className={`w-8 h-8 ${card.color}`} />
                </div>
                <span className="text-xs font-medium text-center inline-block w-fit border-b border-green-500 pb-0.5">
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
