import { prisma } from "@/lib/db";
import { requireClientUser } from "@/lib/client-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SaveCardForm from "@/components/portal/SaveCardForm";
import PaymentMethodsClient from "@/components/portal/PaymentMethodsClient";

export const dynamic = "force-dynamic";

export default async function PortalBillingPage() {
  const { clientId, client } = await requireClientUser();

  const methods = await prisma.clientPaymentMethod.findMany({
    where: { clientId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      stripePaymentMethodId: true,
      brand: true,
      last4: true,
      expMonth: true,
      expYear: true,
      isDefault: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Billing</h2>
        <p className="text-sm text-muted-foreground">{client.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saved cards</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {methods.length === 0 ? (
            <div className="text-sm text-muted-foreground">No saved cards yet. Add one below.</div>
          ) : (
            <PaymentMethodsClient methods={methods} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a card</CardTitle>
        </CardHeader>
        <CardContent>
          <SaveCardForm />
          <div className="mt-2 text-xs text-muted-foreground">
            TODO: Add billing address collection and autopay toggles later.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}