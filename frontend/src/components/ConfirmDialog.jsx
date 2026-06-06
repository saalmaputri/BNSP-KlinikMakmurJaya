import ModalForm from "./ModalForm";

export default function ConfirmDialog({ open, title = "Konfirmasi", message, onCancel, onConfirm }) {
  return (
    <ModalForm
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button className="btn-secondary" onClick={onCancel}>Batal</button>
          <button className="btn-primary bg-danger" onClick={onConfirm}>Ya, lanjutkan</button>
        </>
      }
    >
      <p className="text-muted">{message}</p>
    </ModalForm>
  );
}
