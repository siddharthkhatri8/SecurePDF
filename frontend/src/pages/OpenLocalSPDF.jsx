import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import OTPModal from "../components/OTPModal";
import * as pdfjsLib from "pdfjs-dist";

const OpenLocalSPDF = () => {

  const navigate = useNavigate();

  // ✅ SAFE worker setup (moved inside component)
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    if (window.location.protocol === "file:") {
      pdfjsLib.GlobalWorkerOptions.workerSrc = "./pdf.worker.min.js";
    } else {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        window.location.origin + "/pdf.worker.min.js";
    }
  }

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpData, setOtpData] = useState(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [userContact, setUserContact] = useState("");
  const [contactMethod, setContactMethod] = useState("email");

  const [pdfData, setPdfData] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [isSPDF, setIsSPDF] = useState(false);

  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  /* ================= FILE SELECT ================= */

  const handleFileSelect = (selectedFile) => {

    const fileName = selectedFile.name.toLowerCase();

    if (!fileName.endsWith(".pdf") && !fileName.endsWith(".spdf")) {
      setError("Please select a PDF or SPDF file");
      return;
    }

    setFile(selectedFile);
    setError("");
    setIsSPDF(fileName.endsWith(".spdf"));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else setDragActive(false);
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  /* ================= NORMAL PDF ================= */

  const handleOpenNormalPDF = async () => {

    if (!file) return;

    setLoading(true);
    setError("");

    try {

      const reader = new FileReader();

      reader.onload = async (e) => {

        const pdfBytes = new Uint8Array(e.target.result);

        const pdf = await pdfjsLib.getDocument({
          data: pdfBytes
        }).promise;

        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
        setPdfData("loaded");
        setIsSPDF(false);

        renderPage(pdf, 1);

      };

      reader.readAsArrayBuffer(file);

    } catch (err) {

      console.error(err);
      setError("Failed to open PDF");

    } finally {

      setLoading(false);

    }
  };

  /* ================= SPDF ================= */

  const handleOpenSPDF = () => {

    if (!file) {
      setError("Please select an SPDF file");
      return;
    }

    setShowOTPModal(true);
  };

  const handleRequestOTP = async (method) => {

    if (!userContact) {
      setOtpError("Please enter your contact");
      return;
    }

    setOtpLoading(true);
    setOtpError("");

    try {

      const formData = new FormData();

      formData.append("spdf", file);
      formData.append("contact", userContact);
      formData.append("method", method);

      const response = await api.post(
        "/spdf/request-local-otp",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setOtpData({
        tempId: response.data.data.tempId,
        expiresAt: response.data.data.expiresAt,
        method
      });

    } catch (err) {

      setOtpError(err.response?.data?.message || "Failed to send OTP");

    } finally {

      setOtpLoading(false);

    }
  };

  const handleVerifyOTP = async (otp) => {

    setOtpLoading(true);
    setOtpError("");

    try {

      const response = await api.post("/spdf/verify-local-otp", {
        tempId: otpData.tempId,
        otp
      });

      const { fileData, metadata: fileMetadata } = response.data.data;

      setMetadata(fileMetadata);
      setPdfData(fileData);
      setIsSPDF(true);
      setShowOTPModal(false);

      const pdfBytes = Uint8Array.from(atob(fileData), c => c.charCodeAt(0));

      const pdf = await pdfjsLib.getDocument({
        data: pdfBytes
      }).promise;

      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);

      renderPage(pdf, 1);

    } catch (err) {

      setOtpError(err.response?.data?.message || "Invalid OTP");

    } finally {

      setOtpLoading(false);

    }
  };

  /* ================= PDF RENDER ================= */

  const renderPage = async (pdf, pageNum) => {

    const page = await pdf.getPage(pageNum);

    const scale = 1.5;
    const viewport = page.getViewport({ scale });

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    const outputScale = window.devicePixelRatio || 1;

    canvas.width = viewport.width * outputScale;
    canvas.height = viewport.height * outputScale;

    canvas.style.width = viewport.width + "px";
    canvas.style.height = viewport.height + "px";

    const transform =
      outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

    await page.render({
      canvasContext: context,
      transform,
      viewport
    }).promise;
  };

  const changePage = (delta) => {

    const newPage = currentPage + delta;

    if (newPage >= 1 && newPage <= totalPages) {

      setCurrentPage(newPage);
      renderPage(pdfDoc, newPage);

    }
  };

  /* ================= VIEWER ================= */

  if (pdfData) {

    return (

      <div className="container">

        <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between" }}>

          <button
            className="btn btn-outline"
            onClick={() => {
              setPdfData(null);
              setFile(null);
              setMetadata(null);
            }}
          >
            ← Open Another File
          </button>

          <div>

            <button
              className="btn btn-outline"
              disabled={currentPage === 1}
              onClick={() => changePage(-1)}
            >
              Previous
            </button>

            <span style={{ margin: "0 10px" }}>
              Page {currentPage} / {totalPages}
            </span>

            <button
              className="btn btn-outline"
              disabled={currentPage === totalPages}
              onClick={() => changePage(1)}
            >
              Next
            </button>

          </div>

        </div>

        {isSPDF && metadata && (

          <div className="card" style={{ marginBottom: "20px" }}>

            <h3>📋 Document Information</h3>

            <p><b>Owner:</b> {metadata.ownerUsername}</p>
            <p><b>Created:</b> {new Date(metadata.createdAt).toLocaleDateString()}</p>
            <p><b>Secured By:</b> {metadata.securedBy}</p>
            <p><b>Format:</b> SPDF v1.0</p>

          </div>

        )}

        <div className="card" style={{ padding: 0 }}>

          <div style={{
            maxHeight: "80vh",
            overflow: "auto",
            display: "flex",
            justifyContent: "center",
            background: "#525252"
          }}>
            <canvas ref={canvasRef} />
          </div>

          <div style={{
            padding: "12px",
            textAlign: "center",
            fontSize: "12px"
          }}>
            {isSPDF
              ? "🔒 Secured SPDF document"
              : "📄 Normal PDF opened locally"}
          </div>

        </div>

      </div>
    );
  }

  /* ================= UPLOAD SCREEN ================= */

  return (

    <div className="container" style={{ maxWidth: "700px" }}>

      <h1>Open Local PDF / SPDF</h1>

      <div className="card">

        {error && <div className="alert alert-error">{error}</div>}

        {!file ? (

          <div
            style={{
              border: "2px dashed #ccc",
              padding: "60px",
              textAlign: "center",
              cursor: "pointer"
            }}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >

            <p>Drag & Drop PDF/SPDF here</p>

            <button className="btn btn-primary">Browse Files</button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.spdf"
              style={{ display: "none" }}
              onChange={handleChange}
            />

          </div>

        ) : (

          <div>

            <p>{file.name}</p>

            {isSPDF ? (

              <button
                className="btn btn-primary"
                onClick={handleOpenSPDF}
              >
                Verify & Open SPDF
              </button>

            ) : (

              <button
                className="btn btn-primary"
                onClick={handleOpenNormalPDF}
              >
                Open PDF
              </button>

            )}

          </div>

        )}

      </div>

      {showOTPModal && (

        <OTPModal
          isOpen={true}
          onClose={() => setShowOTPModal(false)}
          onVerify={handleVerifyOTP}
          onRequestOTP={() => handleRequestOTP(contactMethod)}
          loading={otpLoading}
          error={otpError}
          otpSent={!!otpData}
          expiryTime={otpData?.expiresAt}

          userContact={userContact}
          setUserContact={setUserContact}
          contactMethod={contactMethod}
          setContactMethod={setContactMethod}
        />

      )}

    </div>
  );
};

export default OpenLocalSPDF;