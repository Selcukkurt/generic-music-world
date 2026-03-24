import type { InviteUserResult } from "@/lib/rbac-v1/api";

/**
 * RBAC “Kullanıcı ekle / davet” başarı metinleri.
 * - Birincil yol: “davet tamamlandı” + e-posta gönderiminin **başlatıldığı** (gelen kutusu teslimi doğrulanamaz).
 * - Fallback: giden e-posta **gönderildiği iddia edilmez**.
 */
export function getInviteSuccessToast(
  result: InviteUserResult,
  email: string
): { title: string; body: string } {
  if (result.manualInviteLink) {
    return {
      title: "Hesap oluşturuldu — elle davet",
      body:
        `Otomatik e-posta gönderilmedi. Aşağıdaki davet bağlantısını kullanıcıya güvenli bir kanaldan iletin:\n${result.manualInviteLink}`,
    };
  }
  if (result.inviteSent === false) {
    return {
      title: "Hesap oluşturuldu",
      body:
        "Davet e-postası bu adımda gönderilmedi; kullanıcı kaydı oluşturuldu. Gerekirse Supabase Auth üzerinden davet bağlantısı üretin veya destek ekibine danışın.",
    };
  }
  return {
    title: "Davet tamamlandı",
    body: `${email} için davet oluşturuldu; e-posta gönderimi başlatıldı (Generic Music World). Gelen kutusu teslimi sunucu tarafında doğrulanamaz; kullanıcı gelen kutusu veya spam klasörünü kontrol edebilir.`,
  };
}

/** Yönetici “daveti yeniden gönder” — teslim garantisi yok. */
export function getResendInviteToast(
  result: Pick<InviteUserResult, "inviteSent" | "manualInviteLink">
): { title: string; body: string } {
  if (result.manualInviteLink) {
    return {
      title: "Davet bağlantısı oluşturuldu",
      body:
        "Otomatik e-posta bu adımda gönderilmedi. Bağlantıyı güvenli kanaldan iletin:\n" + result.manualInviteLink,
    };
  }
  if (result.inviteSent === false) {
    return {
      title: "İşlem tamamlandı",
      body:
        "Davet e-postası bu adımda gönderilmedi. Gerekirse bağlantıyı kopyalayın veya tekrar deneyin.",
    };
  }
  return {
    title: "Davet yeniden gönderildi",
    body: "E-posta gönderimi başlatıldı; gelen kutusu teslimi doğrulanamaz.",
  };
}

/** Admin şifre sıfırlama bağlantısı — e-posta gönderildiği iddia edilmez. */
export function getPasswordResetLinkToast(manualLink: string | null): { title: string; body: string } {
  if (manualLink) {
    return {
      title: "Şifre sıfırlama bağlantısı",
      body:
        "Bağlantı oluşturuldu. E-posta otomatik gönderimi garanti edilmez; kullanıcıya güvenli kanaldan iletin:\n" + manualLink,
    };
  }
  return {
    title: "Bağlantı oluşturulamadı",
    body: "Şifre sıfırlama bağlantısı üretilemedi.",
  };
}
