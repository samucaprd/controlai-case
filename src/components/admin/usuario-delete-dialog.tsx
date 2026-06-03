import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TenantUser } from "@/features/auth/mock-tenant-users";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

interface UsuarioDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuario: TenantUser | null;
  onConfirm: (options: {
    motivo: string;
    notifyByEmail: boolean;
  }) => Promise<void>;
}

export function UsuarioDeleteDialog({
  open,
  onOpenChange,
  usuario,
  onConfirm,
}: UsuarioDeleteDialogProps) {
  const [motivo, setMotivo] = useState("");
  const [notifyByEmail, setNotifyByEmail] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const useSupabase = isSupabaseConfigured();

  useEffect(() => {
    if (!open) return;
    setMotivo("");
    setNotifyByEmail(false);
    setDeleting(false);
  }, [open, usuario?.id]);

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm({ motivo: motivo.trim(), notifyByEmail });
      onOpenChange(false);
    } finally {
      setDeleting(false);
    }
  };

  if (!usuario) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-border">
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-left text-sm text-muted-foreground">
              <p>
                Você está prestes a remover{" "}
                <span className="font-medium text-foreground">{usuario.nome}</span>{" "}
                (<span className="text-foreground">{usuario.email}</span>) da sua
                empresa. Esta ação não pode ser desfeita.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label htmlFor="delete-motivo">Motivo (opcional)</Label>
            <Textarea
              id="delete-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: desligamento, troca de equipe, conta duplicada…"
              className="min-h-[88px] border-border bg-input resize-none"
              maxLength={500}
              disabled={deleting}
            />
            <p className="text-xs text-muted-foreground">
              Até 500 caracteres. Deixe em branco se não quiser registrar motivo.
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border p-4">
            <Checkbox
              id="delete-notify-email"
              checked={notifyByEmail}
              onCheckedChange={(checked) => setNotifyByEmail(checked === true)}
              disabled={deleting || !useSupabase}
            />
            <div className="space-y-1 leading-none">
              <Label
                htmlFor="delete-notify-email"
                className="cursor-pointer font-medium"
              >
                Informar o motivo por e-mail para {usuario.email}
              </Label>
              <p className="text-xs text-muted-foreground">
                {useSupabase
                  ? "Se marcado, enviaremos um aviso ao usuário antes de remover o acesso. Requer Brevo configurado no Supabase."
                  : "Disponível apenas com Supabase conectado."}
              </p>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={() => void handleConfirm()}
          >
            {deleting ? "Excluindo…" : "Excluir usuário"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
