import { useState } from "react";
import { completeDelivery } from "../services/delivery";

type Props = {
  orderId: string;
  onSuccess?: () => void;
  onClose?: () => void;
};

export default function DeliveryProofUpload({
  orderId,
  onSuccess,
  onClose,
}: Props) {
  const [beforePhoto, setBeforePhoto] = useState<File | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<File | null>(null);
  const [signaturePhoto, setSignaturePhoto] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!beforePhoto || !afterPhoto || !signaturePhoto) {
      alert("All 3 photos are required");
      return;
    }

    try {
      setLoading(true);

      await completeDelivery(
        orderId,
        beforePhoto,
        afterPhoto,
        signaturePhoto
      );

      alert("Delivery Completed Successfully");

      setBeforePhoto(null);
      setAfterPhoto(null);
      setSignaturePhoto(null);

      onSuccess?.();
    } catch (err) {
      console.error(err);
      alert("Failed to complete delivery");
    } finally {
      setLoading(false);
    }
  };

  const UploadBox = ({
    label,
    file,
    setFile,
  }: {
    label: string;
    file: File | null;
    setFile: (f: File | null) => void;
  }) => {
    return (
      <div className="border rounded-xl p-4 mb-4 bg-white shadow-sm">
        <p className="font-semibold mb-2">{label}</p>

        <input
          type="file"
          accept="image/*"
          onChange={(e) =>
            setFile(e.target.files?.[0] || null)
          }
        />

        {file && (
          <div className="mt-3">
            <img
              src={URL.createObjectURL(file)}
              alt={label}
              className="h-40 w-full object-cover rounded-lg"
            />

            <button
              type="button"
              onClick={() => setFile(null)}
              className="text-red-500 text-sm mt-2"
            >
              Remove
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">
          Delivery Proof Upload
        </h2>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800"
          >
            ✕
          </button>
        )}
      </div>

      <UploadBox
        label="Before Cylinder Placement"
        file={beforePhoto}
        setFile={setBeforePhoto}
      />

      <UploadBox
        label="After Cylinder Placement"
        file={afterPhoto}
        setFile={setAfterPhoto}
      />

      <UploadBox
        label="Customer Signature"
        file={signaturePhoto}
        setFile={setSignaturePhoto}
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-green-600 text-white py-2 rounded-lg disabled:opacity-50"
      >
        {loading ? "Completing..." : "Complete Delivery"}
      </button>
    </div>
  );
}