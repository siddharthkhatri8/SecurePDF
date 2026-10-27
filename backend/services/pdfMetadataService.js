const { PDFDocument, PDFName, PDFString } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = crypto.scryptSync(process.env.JWT_SECRET || 'spdf-secret-key', 'salt', 32);

class PDFMetadataService {
  /**
   * Encrypt PDF content using AES-256
   */
  encryptPDFContent(pdfBuffer) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(pdfBuffer),
      cipher.final()
    ]);

    // Combine IV and encrypted data
    return Buffer.concat([iv, encrypted]);
  }

  /**
   * Decrypt SPDF content using AES-256
   */
  decryptSPDFContent(encryptedBuffer) {
    // Extract IV (first 16 bytes)
    const iv = encryptedBuffer.slice(0, 16);
    const encryptedData = encryptedBuffer.slice(16);

    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
    
    const decrypted = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final()
    ]);

    return decrypted;
  }

  /**
   * Convert PDF to SPDF with REAL encryption
   * This creates a truly secure format that cannot be read as PDF
   */
  async convertToSPDF(pdfPath, metadata) {
    try {
      // Read the original PDF
      const pdfBytes = await fs.readFile(pdfPath);
      
      // Load PDF to get page count and metadata
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pageCount = pdfDoc.getPageCount();

      // Encrypt the entire PDF content
      const encryptedContent = this.encryptPDFContent(pdfBytes);

      // Create SPDF metadata object
      const spdfMetadata = {
        version: '1.0',
        format: 'SPDF',
        encryption: 'AES-256-CBC',
        originalFilename: metadata.originalFilename,
        ownerUsername: metadata.ownerUsername,
        allowedUsernames: metadata.allowedUsernames || [],
        allowedEmails: metadata.allowedEmails || [],
        allowedPhones: metadata.allowedPhones || [],
        pageCount: pageCount,
        createdAt: new Date().toISOString(),
        securedBy: 'SPDF System',
        requiresOTP: true,
        websiteURL: process.env.FRONTEND_URL || 'http://localhost:5173',
        warning: 'This file is encrypted and can only be opened through SPDF System'
      };

      // Create SPDF file structure
      const spdfData = {
        header: 'SPDF-ENCRYPTED-FILE-v1.0',
        metadata: spdfMetadata,
        encryptedContent: encryptedContent.toString('base64')
      };

      // Convert to JSON and write as .spdf
      const spdfContent = JSON.stringify(spdfData, null, 2);
      
      const originalName = path.basename(pdfPath, '.pdf');
      const spdfFilename = `${originalName}.spdf`;
      const spdfPath = path.join(path.dirname(pdfPath), spdfFilename);

      await fs.writeFile(spdfPath, spdfContent, 'utf8');

      // Delete original PDF for security
      await fs.unlink(pdfPath);

      console.log(`✅ Converted to ENCRYPTED SPDF: ${spdfFilename}`);
      console.log(`🔐 Encryption: AES-256-CBC`);
      console.log(`📋 Embedded metadata for owner: ${metadata.ownerUsername}`);

      return {
        success: true,
        spdfPath,
        spdfFilename,
        metadata: spdfMetadata
      };
    } catch (error) {
      console.error('Error converting to SPDF:', error);
      throw new Error('Failed to convert PDF to SPDF: ' + error.message);
    }
  }

  /**
   * Read and validate SPDF file metadata WITHOUT decrypting
   */
  async readSPDFMetadata(spdfPath) {
    try {
      const spdfContent = await fs.readFile(spdfPath, 'utf8');
      const spdfData = JSON.parse(spdfContent);

      // Validate SPDF structure
      if (!spdfData.header || !spdfData.header.startsWith('SPDF-ENCRYPTED-FILE')) {
        return {
          valid: false,
          message: 'Not a valid SPDF file - missing encryption header'
        };
      }

      if (!spdfData.metadata || !spdfData.encryptedContent) {
        return {
          valid: false,
          message: 'Invalid SPDF structure'
        };
      }

      return {
        valid: true,
        metadata: spdfData.metadata,
        encrypted: true,
        message: 'Valid encrypted SPDF file'
      };
    } catch (error) {
      console.error('Error reading SPDF metadata:', error);
      return {
        valid: false,
        message: 'Failed to read SPDF: ' + error.message
      };
    }
  }

  /**
   * Decrypt and read SPDF file (requires proper authorization)
   */
  async decryptAndReadSPDF(spdfPath) {
    try {
      const spdfContent = await fs.readFile(spdfPath, 'utf8');
      const spdfData = JSON.parse(spdfContent);

      if (!spdfData.header || !spdfData.header.startsWith('SPDF-ENCRYPTED-FILE')) {
        throw new Error('Not a valid encrypted SPDF file');
      }

      // Decrypt the content
      const encryptedBuffer = Buffer.from(spdfData.encryptedContent, 'base64');
      const decryptedPDF = this.decryptSPDFContent(encryptedBuffer);

      return {
        pdfBuffer: decryptedPDF,
        metadata: spdfData.metadata
      };
    } catch (error) {
      console.error('Error decrypting SPDF:', error);
      throw new Error('Failed to decrypt SPDF: ' + error.message);
    }
  }

  /**
   * Update SPDF metadata when access rules change
   */
  async updateSPDFMetadata(spdfPath, metadata) {
    try {
      const spdfContent = await fs.readFile(spdfPath, 'utf8');
      const spdfData = JSON.parse(spdfContent);

      // Update metadata
      spdfData.metadata.ownerUsername = metadata.ownerUsername || spdfData.metadata.ownerUsername;
      spdfData.metadata.allowedUsernames = metadata.allowedUsernames || spdfData.metadata.allowedUsernames;
      spdfData.metadata.allowedEmails = metadata.allowedEmails || spdfData.metadata.allowedEmails;
      spdfData.metadata.allowedPhones = metadata.allowedPhones || spdfData.metadata.allowedPhones;
      spdfData.metadata.lastModified = new Date().toISOString();

      // Write updated SPDF
      await fs.writeFile(spdfPath, JSON.stringify(spdfData, null, 2), 'utf8');

      console.log(`✅ Updated SPDF metadata: ${path.basename(spdfPath)}`);
      return { success: true };
    } catch (error) {
      console.error('Error updating SPDF metadata:', error);
      throw new Error('Failed to update SPDF metadata: ' + error.message);
    }
  }

  /**
   * Read SPDF file and return encrypted buffer (for download)
   */
  async readSPDF(spdfPath) {
    try {
      const buffer = await fs.readFile(spdfPath);
      return buffer;
    } catch (error) {
      console.error('Error reading SPDF:', error);
      throw new Error('Failed to read SPDF file: ' + error.message);
    }
  }

  /**
   * Check if user has access based on embedded metadata
   */
  async checkSPDFAccess(spdfPath, user) {
    try {
      const metadataResult = await this.readSPDFMetadata(spdfPath);
      
      if (!metadataResult.valid) {
        return { hasAccess: false, reason: 'Invalid SPDF file' };
      }

      const { metadata } = metadataResult;

      // Check if user is owner
      if (metadata.ownerUsername === user.username) {
        return { hasAccess: true, reason: 'Owner' };
      }

      // Check allowed lists
      const usernameMatch = metadata.allowedUsernames.includes(user.username);
      const emailMatch = metadata.allowedEmails.includes(user.email);
      const phoneMatch = metadata.allowedPhones.includes(user.phone);

      if (usernameMatch || emailMatch || phoneMatch) {
        return { hasAccess: true, reason: 'Authorized user' };
      }

      return { hasAccess: false, reason: 'Not authorized' };
    } catch (error) {
      console.error('Error checking SPDF access:', error);
      return { hasAccess: false, reason: 'Error checking access' };
    }
  }

  /**
   * Validate SPDF file integrity
   */
  async validateSPDF(spdfPath) {
    try {
      const metadataResult = await this.readSPDFMetadata(spdfPath);
      
      return {
        valid: metadataResult.valid,
        isSPDF: metadataResult.valid,
        encrypted: metadataResult.encrypted,
        metadata: metadataResult.metadata
      };
    } catch (error) {
      return {
        valid: false,
        isSPDF: false,
        error: error.message
      };
    }
  }

  /**
   * Delete SPDF file
   */
  async deleteSPDF(spdfPath) {
    try {
      await fs.unlink(spdfPath);
      console.log(`✅ Deleted SPDF: ${path.basename(spdfPath)}`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting SPDF:', error);
      throw new Error('Failed to delete SPDF file: ' + error.message);
    }
  }
}

module.exports = new PDFMetadataService();