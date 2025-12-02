// Type declarations for Google APIs

declare namespace google {
  namespace accounts {
    namespace oauth2 {
      interface TokenClient {
        requestAccessToken(options?: { prompt?: string }): void;
      }

      interface TokenResponse {
        access_token: string;
        error?: string;
        expires_in: number;
        scope: string;
        token_type: string;
      }

      function initTokenClient(config: {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
      }): TokenClient;

      function revoke(token: string, callback: () => void): void;
    }
  }

  namespace picker {
    enum Action {
      CANCEL = 'cancel',
      PICKED = 'picked',
    }

    enum ViewId {
      DOCS = 'docs',
      DOCS_IMAGES = 'docs-images',
      DOCS_VIDEOS = 'docs-videos',
      DOCUMENTS = 'documents',
      FOLDERS = 'folders',
      FORMS = 'forms',
      PDFS = 'pdfs',
      SPREADSHEETS = 'spreadsheets',
    }

    interface DocumentObject {
      id: string;
      name: string;
      mimeType: string;
      url: string;
    }

    interface PickerResponse {
      action: Action;
      docs: DocumentObject[];
    }

    class View {
      constructor(viewId: ViewId);
      setMimeTypes(mimeTypes: string): View;
    }

    class PickerBuilder {
      addView(view: View): PickerBuilder;
      setOAuthToken(token: string): PickerBuilder;
      setDeveloperKey(key: string): PickerBuilder;
      setCallback(callback: (data: PickerResponse) => void): PickerBuilder;
      build(): Picker;
    }

    class Picker {
      setVisible(visible: boolean): void;
    }
  }
}

declare namespace gapi {
  function load(api: string, callback: () => void): void;

  namespace client {
    function init(config: {
      apiKey?: string;
      discoveryDocs?: string[];
    }): Promise<void>;
  }
}

