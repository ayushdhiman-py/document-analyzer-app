import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { pick } from '@react-native-documents/picker';
import { launchCamera } from 'react-native-image-picker';
import axios from 'axios';
import RNFS from 'react-native-fs';
import Markdown from 'react-native-markdown-display';

const App = () => {
  // This API key is hardcoded ONLY FOR TESTING PURPOSES to ensure the app runs on mobile directly.  
  const API_KEY = 'AIzaSyD-uMcqFmkv878YkIriFDKCMx4CdokjGoE';
  // IN PRODUCTION, I would have securely stored it in an .env file to prevent exposure.

  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);

  const handleFileSelection = async (source) => {
    setResponse(null);
    setLoading(true);

    try {
      let file;

      if (source === 'upload') {
        const pickedFiles = await pick({ type: ['*/*'] });
        if (!pickedFiles || pickedFiles.length === 0) {
          setLoading(false);
          return;
        }
        file = pickedFiles[0];
      } else if (source === 'camera') {
        const result = await launchCamera({ mediaType: 'photo', quality: 1 });
        if (result.didCancel || !result.assets?.length) {
          setLoading(false);
          return;
        }
        file = result.assets[0];
      }

      if (!file?.uri) {
        setLoading(false);
        return;
      }

      processFile(file.uri, file.type, file.name || file.fileName || 'Unnamed File');
    } catch (error) {
      console.error('File Selection Error:', error);
      setLoading(false);
    }
  };

  const processFile = async (fileUri, mimeType, fileName) => {
    setLoading(true);
    setFileInfo({
      type: mimeType.split('/').pop().toUpperCase(),
      name: fileName,
    });

    const base64File = await fileToBase64(fileUri);
    if (!base64File) {
      setLoading(false);
      return;
    }

    const apiResponse = await sendToGemini(base64File, mimeType);
    setResponse(apiResponse);
    setLoading(false);
  };

  const sendToGemini = async (base64File, mimeType) => {
    try {
      const { data } = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
        { contents: [{ parts: [{ inlineData: { data: base64File, mimeType } }] }] }
      );
      return data;
    } catch (error) {
      console.error('Gemini API Error:', error);
      return null;
    }
  };

  const fileToBase64 = async (fileUri) => {
    try {
      return await RNFS.readFile(fileUri, 'base64');
    } catch (error) {
      console.error('Error, Conversion to Base64:', error);
      return null;
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', marginTop: 20 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 20 }}>DOCUMENT INFORMATION</Text>
      </View>
      <ScrollView
        style={{
          marginTop: 20,
          maxHeight: 650,
          backgroundColor: '#f0f0f0',
          padding: 20,
          borderRadius: 10,
        }}
        nestedScrollEnabled={true}
      >
        {fileInfo && (
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontWeight: 'bold' }}>FILE NAME:</Text>
            <Text>{fileInfo.name}</Text>
            <Text style={{ fontWeight: 'bold' }}>FILE TYPE:</Text>
            <Text>{fileInfo.type}</Text>
          </View>
        )}
        {response && (
          <View style={{ marginBottom: 30 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Response Received:</Text>
            {response.candidates?.length > 0 ? (
              <Markdown style={{ marginBottom: 10 }}>
                {response.candidates[0].content.parts[0]?.text}
              </Markdown>
            ) : null}
          </View>
        )}
      </ScrollView>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
        <TouchableOpacity
          onPress={() => handleFileSelection('upload')}
          style={{ flex: 1, padding: 20, backgroundColor: 'blue', borderRadius: 10, marginRight: 10 }}
        >
          <Text style={{ color: 'white', textAlign: 'center' }}>Upload Document</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleFileSelection('camera')}
          style={{ flex: 1, padding: 20, backgroundColor: 'green', borderRadius: 10 }}
        >
          <Text style={{ color: 'white', textAlign: 'center' }}>Use Camera</Text>
        </TouchableOpacity>
      </View>
      {loading && <ActivityIndicator size="large" color="blue" style={{ marginTop: 20 }} />}
    </View>
  );
};

export default App;
