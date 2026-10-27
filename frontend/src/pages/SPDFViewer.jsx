import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

const SPDFViewer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canvasRef = useRef(null);

  const [showOTPModal, setShowOTPModal] = useState(true);
  const [method, setMethod] = useState("email");
  const [otpId, setOtpId] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  /* ================= OTP ================= */

  const requestOTP = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/otp/request", { fileId: id, method });
      setOtpId(response.data.data.otpId);
      alert(`OTP sent to your ${method}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp || !otpId) {
      setError("Please enter OTP");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.post("/otp/verify", { otpId, otp });

      const fileData = response.data.data.fileData;

      setShowOTPModal(false);
      await loadPDF(fileData);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  /* ================= LOAD PDF ================= */

  const loadPDF = async (base64Data) => {
    try {
      const pdfBytes = Uint8Array.from(atob(base64Data), (c) =>
        c.charCodeAt(0)
      );

      const pdf = await pdfjsLib.getDocument({
        data: pdfBytes,
      }).promise;

      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);

      renderPage(pdf, 1);
    } catch (err) {
      console.error(err);
      setError("Failed to load PDF");
    }
  };

  /* ================= RENDER PAGE ================= */

  const renderPage = async (pdf, pageNum) => {
    if (!pdf) return;

    const page = await pdf.getPage(pageNum);

    const scale = 1.5;
    const viewport = page.getViewport({ scale });

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    const outputScale = window.devicePixelRatio || 1;

    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);

    canvas.style.width = Math.floor(viewport.width) + "px";
    canvas.style.height = Math.floor(viewport.height) + "px";

    const transform =
      outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

    const renderContext = {
      canvasContext: context,
      transform,
      viewport,
    };

    await page.render(renderContext).promise;
  };

  /* ================= PAGE CHANGE ================= */

  const changePage = (delta) => {
    const newPage = currentPage + delta;

    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      renderPage(pdfDoc, newPage);
    }
  };

  /* ================= SECURITY ================= */

  useEffect(() => {
    const preventDefaults = (e) => e.preventDefault();

    const preventCopy = (e) => {
      if (e.ctrlKey && ["c", "C", "p", "P"].includes(e.key)) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", preventDefaults);
    document.addEventListener("copy", preventDefaults);
    document.addEventListener("keydown", preventCopy);

    return () => {
      document.removeEventListener("contextmenu", preventDefaults);
      document.removeEventListener("copy", preventDefaults);
      document.removeEventListener("keydown", preventCopy);
    };
  }, []);

  /* ================= OTP MODAL ================= */

  if (showOTPModal) {
    return (
      <div className="modal-overlay">
        <div className="modal">
          <div className="modal-header">
            <h2>OTP Verification Required</h2>
            <button
              className="close-btn"
              onClick={() => navigate("/dashboard")}
            >
              ×
            </button>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px" }}>
              Verification Method:
            </label>

            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid var(--border)",
                borderRadius: "6px",
              }}
            >
              <option value="email">Email</option>
              <option value="phone">Phone (SMS)</option>
            </select>
          </div>

          {!otpId ? (
            <button
              onClick={requestOTP}
              className="btn btn-primary"
              style={{ width: "100%" }}
              disabled={loading}
            >
              {loading ? "Sending..." : `Send OTP via ${method}`}
            </button>
          ) : (
            <>
              <div className="input-group">
                <label>Enter OTP Code</label>

                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength="6"
                  autoFocus
                />
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={verifyOTP}
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? "Verifying..." : "Verify & Open"}
                </button>

                <button
                  onClick={() => setOtpId("")}
                  className="btn btn-outline"
                >
                  Resend OTP
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ================= VIEWER ================= */

  return (
    <div className="container">
      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button
          onClick={() => navigate("/dashboard")}
          className="btn btn-outline"
        >
          ← Back to Dashboard
        </button>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            onClick={() => changePage(-1)}
            className="btn btn-outline"
            disabled={currentPage === 1}
          >
            Previous
          </button>

          <span>
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => changePage(1)}
            className="btn btn-outline"
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>

      <div
        className="card"
        style={{ position: "relative", padding: "0", overflow: "hidden" }}
      >
        {/* USER WATERMARK */}
        <div
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            background: "rgba(0,0,0,0.7)",
            color: "white",
            padding: "8px 16px",
            borderRadius: "4px",
            fontSize: "14px",
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          Viewing as: {user.username}
        </div>

        {/* PDF CANVAS */}

        <div
          style={{
            maxHeight: "80vh",
            overflow: "auto",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            background: "#525252",
            userSelect: "none",
          }}
        >
          <canvas ref={canvasRef} />
        </div>

        <div
          style={{
            padding: "12px",
            background: "var(--bg)",
            borderTop: "1px solid var(--border)",
            fontSize: "12px",
            color: "var(--text-light)",
            textAlign: "center",
          }}
        >
          🔒 This document is protected. Copying, printing, and screenshots are
          restricted.
        </div>
      </div>
    </div>
  );
};

export default SPDFViewer;