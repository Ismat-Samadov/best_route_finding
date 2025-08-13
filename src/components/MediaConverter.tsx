'use client';

import { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Upload, Download, FileVideo, Loader2, Check, AlertCircle } from 'lucide-react';

interface ConversionStatus {
  status: 'idle' | 'loading' | 'converting' | 'completed' | 'error';
  progress: number;
  message: string;
}

export default function MediaConverter() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "GIF to MP4 Converter",
    "description": "Convert GIF files to MP4 format instantly with our free, browser-based converter",
    "url": "https://mediaconverter-one.vercel.app",
    "applicationCategory": "MultimediaApplication",
    "operatingSystem": "Any",
    "permissions": "browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": [
      "Convert GIF to MP4",
      "Browser-based conversion",
      "No file uploads required",
      "High quality output",
      "Fast processing"
    ]
  };
  const [ffmpeg, setFFmpeg] = useState<FFmpeg | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [convertedVideoUrl, setConvertedVideoUrl] = useState<string | null>(null);
  const [conversion, setConversion] = useState<ConversionStatus>({
    status: 'idle',
    progress: 0,
    message: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setConversion({ status: 'loading', progress: 0, message: 'Loading FFmpeg...' });
    
    try {
      const ffmpegInstance = new FFmpeg();
      
      // Try multiple CDN sources for better reliability
      const cdnSources = [
        'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd',
        'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd'
      ];
      
      ffmpegInstance.on('log', ({ message }) => {
        console.log(message);
      });
      
      ffmpegInstance.on('progress', ({ progress }) => {
        if (conversion.status === 'converting') {
          setConversion(prev => ({ 
            ...prev, 
            progress: Math.round(progress * 100),
            message: `Converting... ${Math.round(progress * 100)}%`
          }));
        }
      });

      let loaded = false;
      for (const baseURL of cdnSources) {
        try {
          await ffmpegInstance.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
          });
          loaded = true;
          break;
        } catch (cdnError) {
          console.warn(`Failed to load from ${baseURL}:`, cdnError);
          continue;
        }
      }

      if (!loaded) {
        throw new Error('Failed to load FFmpeg from all CDN sources');
      }

      setFFmpeg(ffmpegInstance);
      setLoaded(true);
      setConversion({ status: 'idle', progress: 0, message: 'Ready to convert!' });
    } catch (error) {
      console.error('Failed to load FFmpeg:', error);
      setConversion({ 
        status: 'error', 
        progress: 0, 
        message: 'Failed to load FFmpeg. This may be due to browser restrictions. Try using Chrome or Firefox.' 
      });
    }
  };

  const checkBrowserSupport = () => {
    if (typeof SharedArrayBuffer === 'undefined') {
      setConversion({ 
        status: 'error', 
        progress: 0, 
        message: 'Your browser does not support SharedArrayBuffer. Please use Chrome, Firefox, or Safari with HTTPS.' 
      });
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (checkBrowserSupport()) {
      load();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'image/gif') {
      setSelectedFile(file);
      setConvertedVideoUrl(null);
      setConversion({ status: 'idle', progress: 0, message: 'Ready to convert!' });
    } else {
      alert('Please select a GIF file');
    }
  };

  const handleConvert = async () => {
    if (!ffmpeg || !selectedFile || !loaded) return;

    setConversion({ status: 'converting', progress: 0, message: 'Starting conversion...' });

    try {
      const inputFileName = 'input.gif';
      const outputFileName = 'output.mp4';

      await ffmpeg.writeFile(inputFileName, await fetchFile(selectedFile));

      await ffmpeg.exec([
        '-i', inputFileName,
        '-movflags', '+faststart',
        '-pix_fmt', 'yuv420p',
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        outputFileName
      ]);

      const data = (await ffmpeg.readFile(outputFileName)) as Uint8Array;
      const videoBlob = new Blob([data.slice()], { type: 'video/mp4' });
      const videoUrl = URL.createObjectURL(videoBlob);
      
      setConvertedVideoUrl(videoUrl);
      setConversion({ 
        status: 'completed', 
        progress: 100, 
        message: 'Conversion completed successfully!' 
      });
    } catch (error) {
      console.error('Conversion failed:', error);
      setConversion({ 
        status: 'error', 
        progress: 0, 
        message: 'Conversion failed. Please try again.' 
      });
    }
  };

  const handleDownload = () => {
    if (!convertedVideoUrl) return;
    
    const link = document.createElement('a');
    link.href = convertedVideoUrl;
    link.download = `converted-${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetConverter = () => {
    setSelectedFile(null);
    setConvertedVideoUrl(null);
    setConversion({ status: 'idle', progress: 0, message: 'Ready to convert!' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStatusIcon = () => {
    switch (conversion.status) {
      case 'loading':
      case 'converting':
        return <Loader2 className="w-5 h-5 animate-spin" />;
      case 'completed':
        return <Check className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <FileVideo className="w-5 h-5" />;
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 pt-8">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-4">
            GIF to MP4 Converter
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Convert your GIF files to MP4 format instantly. Fast, secure, and completely browser-based conversion.
          </p>
        </div>

        {/* Main Converter Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8 mb-8">
          {/* File Upload Area */}
          <div className="mb-8">
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${
                selectedFile 
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                  : 'border-gray-300 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-400'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".gif,image/gif"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <div className="flex flex-col items-center space-y-4">
                <Upload className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                {selectedFile ? (
                  <div className="text-center">
                    <p className="text-lg font-medium text-green-700 dark:text-green-300">
                      Selected: {selectedFile.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                      Drop your GIF file here or click to browse
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Supports GIF files up to 100MB
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status and Progress */}
          {conversion.status !== 'idle' && (
            <div className="mb-6">
              <div className="flex items-center space-x-3 mb-3">
                {getStatusIcon()}
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {conversion.message}
                </span>
              </div>
              
              {conversion.status === 'converting' && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${conversion.progress}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleConvert}
              disabled={!selectedFile || !loaded || conversion.status === 'converting'}
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition-colors duration-200 ${
                selectedFile && loaded && conversion.status !== 'converting'
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              {conversion.status === 'converting' ? 'Converting...' : 'Convert to MP4'}
            </button>

            {conversion.status === 'error' && (
              <button
                onClick={() => {
                  setConversion({ status: 'idle', progress: 0, message: '' });
                  if (checkBrowserSupport()) {
                    load();
                  }
                }}
                className="py-3 px-6 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors duration-200"
              >
                Retry Loading
              </button>
            )}

            {convertedVideoUrl && (
              <button
                onClick={handleDownload}
                className="flex items-center justify-center space-x-2 py-3 px-6 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-200"
              >
                <Download className="w-5 h-5" />
                <span>Download MP4</span>
              </button>
            )}

            {(selectedFile || convertedVideoUrl) && (
              <button
                onClick={resetConverter}
                className="py-3 px-6 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors duration-200"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Preview Section */}
        {convertedVideoUrl && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8 mb-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Converted Video Preview
            </h3>
            <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
              <video 
                src={convertedVideoUrl} 
                controls 
                className="w-full h-full object-contain"
                preload="metadata"
              />
            </div>
          </div>
        )}

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {[
            {
              title: "Fast Conversion",
              description: "Client-side processing means your files never leave your browser",
              icon: "⚡"
            },
            {
              title: "High Quality",
              description: "Maintains original quality while optimizing for web playback",
              icon: "🎯"
            },
            {
              title: "Privacy First",
              description: "No uploads to servers. Everything happens locally in your browser",
              icon: "🔒"
            }
          ].map((feature, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {feature.title}
              </h4>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Browser Compatibility Notice */}
        {conversion.status === 'error' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-8">
            <h4 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              Browser Compatibility Issue
            </h4>
            <p className="text-yellow-700 dark:text-yellow-300 text-sm mb-3">
              {conversion.message}
            </p>
            <div className="text-sm text-yellow-600 dark:text-yellow-400">
              <p className="mb-2"><strong>Recommended browsers:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Chrome 68+ (with HTTPS)</li>
                <li>Firefox 79+ (with HTTPS)</li>
                <li>Safari 15.2+ (with HTTPS)</li>
                <li>Edge 88+ (with HTTPS)</li>
              </ul>
              <p className="mt-3 text-xs">
                Note: This application requires SharedArrayBuffer support and must be served over HTTPS.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
          <p>Built with Next.js and FFmpeg.wasm • No server uploads required</p>
        </div>
      </div>
    </div>
    </>
  );
}