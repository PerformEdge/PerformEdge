import { Card, CardContent } from "@/components/ui/card";

export function MetricCard({ title, value, icon: Icon, trend, trendUp }) {
  return (
    <Card className="transition hover:-translate-y-0.5 hover:shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-semibold text-muted-foreground">{title}</p>
            <h3 className="text-3xl font-bold mt-2 text-foreground">{value}</h3>
            {trend ? (
              <p
                className={
                  "text-sm mt-2 font-semibold " + (trendUp === false ? "text-red-600" : "text-green-600")
                }
              >
                {trend}
              </p>
            ) : null}
          </div>
          <div className="p-3 bg-primary/10 rounded-xl">
            <Icon className="w-6 h-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
