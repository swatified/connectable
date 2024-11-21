import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('q');

  if (!searchTerm) {
    return NextResponse.json({ 
      success: false, 
      error: 'Search term is required' 
    });
  }

  try {
    // Log to verify the API key is available
    if (!process.env.TENOR_API_KEY) {
      console.error('Tenor API key is missing');
      throw new Error('API key not configured');
    }

    const apiUrl = new URL('https://tenor.googleapis.com/v2/search');
    apiUrl.searchParams.append('q', searchTerm);
    apiUrl.searchParams.append('key', process.env.TENOR_API_KEY);
    apiUrl.searchParams.append('client_key', 'my_chat_app');
    apiUrl.searchParams.append('limit', '20');
    apiUrl.searchParams.append('media_filter', 'tinygif,gif');

    console.log('Fetching from Tenor:', apiUrl.toString());

    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Tenor API error:', errorText);
      throw new Error(`Tenor API responded with status ${response.status}`);
    }

    const data = await response.json();
    
    // Log the response structure
    console.log('Tenor response structure:', JSON.stringify(data, null, 2));

    // Transform the data to a simpler format
    const results = data.results.map(result => ({
      id: result.id,
      title: result.title,
      content_description: result.content_description,
      media_formats: {
        tinygif: {
          url: result.media_formats.tinygif.url
        },
        gif: {
          url: result.media_formats.gif.url
        }
      }
    }));

    return NextResponse.json({ 
      success: true, 
      results 
    });

  } catch (error) {
    console.error('Error in Tenor API route:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to fetch GIFs'
    }, { status: 500 });
  }
}
