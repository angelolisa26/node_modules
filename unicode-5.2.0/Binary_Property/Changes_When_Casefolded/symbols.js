module.exports=JSON.parse(require('zlib').gunzipSync(Buffer.from([31,139,8,0,0,0,0,0,0,19,93,217,219,178,236,166,21,133,225,119,217,215,185,88,192,68,160,75,9,129,19,59,231,56,7,219,201,99,228,253,163,42,235,235,42,229,130,93,67,181,196,175,65,211,115,104,210,251,151,111,199,183,223,124,59,239,49,238,113,221,99,222,99,221,227,187,123,252,246,30,191,187,199,247,247,248,225,30,191,191,199,31,238,241,199,123,252,233,30,127,190,199,95,238,241,215,123,252,237,30,63,222,227,239,247,248,199,61,254,121,143,127,221,227,167,123,252,124,143,127,255,247,235,235,172,143,24,95,68,34,50,81,136,32,62,179,54,162,17,157,216,137,131,56,137,65,92,196,36,214,35,46,126,46,126,46,126,46,126,46,126,46,126,46,126,46,54,46,54,46,54,46,54,46,54,46,54,46,54,174,199,70,250,250,34,50,17,196,70,116,226,32,6,241,0,83,194,73,56,9,39,225,36,156,132,147,112,18,78,198,201,56,25,39,227,100,156,140,147,113,50,78,193,41,56,5,167,224,148,157,56,137,139,240,249,68,34,10,81,137,70,224,4,63,193,79,240,83,249,169,252,84,126,42,63,213,186,42,78,197,169,56,27,206,134,179,225,108,56,27,206,134,179,225,108,56,13,167,225,52,156,134,211,112,154,5,54,31,84,243,65,53,31,84,247,65,117,192,14,216,1,187,79,172,3,118,14,59,114,231,176,35,239,172,238,30,177,219,139,221,35,118,143,216,61,98,103,126,183,246,157,231,29,249,64,62,120,62,0,15,192,3,240,224,249,0,60,88,61,0,79,14,79,192,147,85,65,148,78,192,147,195,19,80,254,36,249,147,196,78,18,59,73,218,36,105,147,132,76,146,45,73,164,36,73,146,4,72,186,0,229,70,18,23,73,56,164,233,99,153,86,49,25,155,62,150,201,207,228,103,90,197,196,89,108,44,156,133,179,112,22,63,11,112,1,46,192,245,0,179,176,202,194,42,11,171,44,172,178,176,202,194,42,11,171,44,172,178,176,202,194,42,11,171,44,172,178,176,202,194,42,11,171,44,172,178,176,202,194,42,11,171,44,172,178,176,202,194,42,11,171,44,172,178,176,202,194,42,23,55,139,166,44,154,114,49,75,52,101,209,148,195,211,101,84,14,54,130,13,25,149,101,84,150,81,197,172,34,28,138,112,40,50,161,244,143,232,196,78,28,196,32,144,213,114,81,194,101,71,86,203,69,45,151,157,13,69,93,20,117,81,212,101,247,208,221,67,247,147,240,116,245,94,118,54,20,126,81,248,229,224,231,96,67,2,148,131,13,81,80,68,65,57,216,144,9,229,96,227,96,67,119,81,84,101,241,198,47,202,179,168,202,226,181,94,188,214,139,183,121,241,18,47,202,179,40,207,162,60,139,242,44,202,179,40,207,162,60,139,242,44,202,179,44,28,117,90,148,103,89,140,41,207,178,172,84,121,150,229,227,93,31,224,179,210,80,167,241,149,136,76,20,34,136,74,108,68,35,58,177,19,7,113,18,131,184,136,73,240,163,222,35,241,163,240,35,241,35,1,34,241,35,10,34,241,35,19,34,241,35,28,34,241,35,37,34,241,35,46,34,241,35,55,34,243,35,64,34,243,35,73,34,243,35,82,34,243,35,91,34,243,35,100,34,243,35,109,34,243,35,118,34,243,163,169,8,77,69,104,42,66,83,17,154,138,208,84,132,166,34,52,21,33,55,66,110,132,166,34,4,72,104,42,162,225,52,156,134,211,113,68,74,136,148,16,41,161,43,8,73,18,2,36,228,70,136,139,144,18,33,28,66,38,132,40,8,61,64,72,128,80,248,161,222,67,153,135,30,32,244,0,113,226,120,245,199,137,115,226,120,227,199,137,227,213,31,39,142,115,74,56,167,132,227,73,232,10,66,87,16,206,32,161,25,8,205,64,72,155,112,172,8,167,137,144,54,33,109,66,218,132,180,9,105,19,210,38,164,77,72,155,144,54,33,109,66,218,132,180,9,105,19,210,38,52,3,33,109,66,51,16,122,128,16,50,161,7,8,33,83,101,75,21,41,85,146,84,1,82,229,70,21,23,85,74,84,225,80,101,66,21,5,85,2,84,133,95,213,123,85,230,85,117,87,69,93,213,114,85,194,85,229,214,146,8,127,42,133,248,220,83,9,15,45,141,240,116,231,148,170,43,168,186,130,90,248,209,30,84,237,65,117,132,169,193,161,134,161,6,63,58,135,170,115,168,122,128,170,115,168,142,57,85,11,81,157,119,170,94,162,6,63,154,138,26,252,232,46,106,240,227,40,84,43,63,206,68,181,242,227,112,84,43,63,78,73,245,57,68,220,135,209,47,34,17,153,40,68,16,149,216,136,15,167,19,59,113,16,39,49,136,139,152,196,122,196,201,207,201,207,201,207,201,207,201,207,201,207,201,207,201,207,201,207,201,207,201,207,201,207,201,207,201,207,201,207,201,207,224,103,240,51,248,25,252,12,126,158,108,185,123,255,47,34,19,65,108,68,39,14,98,16,143,141,153,112,18,78,194,73,56,9,39,225,36,156,132,147,113,50,78,198,201,56,25,39,227,100,156,140,83,112,10,78,193,41,56,5,167,224,20,156,130,19,56,129,19,56,129,19,56,129,19,56,129,83,113,42,78,197,169,56,21,167,226,84,156,138,179,225,108,56,27,206,134,179,225,108,56,27,206,134,211,112,26,78,195,105,56,13,167,225,52,156,134,211,113,58,78,199,233,56,29,167,227,116,156,142,179,227,236,56,59,206,110,214,211,243,223,194,44,153,48,69,193,148,0,83,225,79,245,62,149,249,84,221,83,81,79,181,60,149,240,84,185,83,193,78,117,58,149,231,84,149,83,49,78,53,56,149,222,84,113,115,224,12,156,129,51,112,6,206,133,115,225,92,56,23,206,133,115,225,92,56,23,206,196,153,56,19,103,226,76,156,137,51,113,38,206,194,89,56,11,103,225,44,156,133,179,112,158,183,121,90,146,100,61,29,254,45,14,226,36,6,113,17,159,233,79,214,45,73,178,18,142,72,89,9,71,182,172,132,35,55,86,54,75,128,172,108,150,36,89,249,51,203,211,179,167,203,141,85,112,4,200,42,56,146,100,21,28,145,178,10,142,220,88,129,35,64,86,224,72,146,21,56,213,205,213,61,245,243,39,100,9,176,54,55,139,130,181,153,37,19,214,102,186,112,88,27,142,234,94,207,207,125,183,200,68,33,130,168,196,70,52,130,159,206,143,40,88,157,31,153,176,58,63,194,97,117,126,164,196,218,249,17,23,107,231,71,110,172,157,159,157,159,157,159,157,159,157,31,33,179,132,204,218,249,217,249,17,59,107,231,71,254,44,61,201,18,68,75,79,178,36,210,210,147,44,209,180,244,36,75,70,45,61,201,18,86,75,79,178,164,214,210,147,44,241,181,244,36,75,124,45,29,200,146,99,75,191,177,228,216,210,111,44,129,182,244,27,75,178,45,57,182,180,16,75,160,173,1,40,208,214,0,148,108,107,0,138,184,37,181,214,229,102,241,181,46,55,75,164,53,221,35,154,214,252,220,3,40,145,214,226,80,52,173,197,161,104,90,11,80,70,173,5,248,132,85,246,255,14,217,127,55,220,226,124,196,211,75,100,63,203,223,34,17,159,63,21,34,136,74,32,111,141,232,196,78,120,232,230,161,27,99,79,157,102,191,234,223,98,61,226,41,198,236,236,121,139,70,116,98,39,14,226,36,6,113,17,147,120,30,225,160,154,29,84,111,145,9,79,127,190,27,217,209,245,22,252,12,126,6,63,131,159,193,207,224,103,240,51,248,25,252,60,63,175,229,241,52,174,183,72,68,38,10,17,68,37,54,162,17,157,216,137,131,56,137,65,92,196,36,248,73,252,36,126,18,63,137,159,196,79,226,39,241,147,248,73,252,36,126,18,63,137,159,196,79,226,39,241,147,248,201,252,100,126,50,63,153,159,204,79,230,199,151,127,100,126,50,63,153,31,117,49,212,197,200,252,100,126,50,63,42,101,40,144,161,64,134,2,25,202,97,168,130,225,203,63,124,231,199,246,1,90,96,67,110,200,205,42,154,155,155,155,187,155,187,155,187,167,119,75,238,86,218,45,176,91,87,7,220,113,118,156,29,103,199,217,113,118,156,29,103,199,57,112,14,156,3,231,192,57,112,14,156,3,231,192,57,113,78,156,19,71,20,12,9,48,20,254,80,239,67,153,15,213,61,20,245,80,203,67,9,15,149,59,20,236,80,167,67,121,142,11,231,194,185,112,46,156,11,231,194,185,112,46,156,137,51,113,166,175,196,252,245,43,113,108,207,209,236,22,153,8,98,35,58,113,16,131,152,143,168,56,21,167,226,84,156,138,83,113,42,78,197,217,76,223,76,223,76,223,76,223,76,223,76,239,158,222,77,239,166,119,211,187,233,221,244,254,153,238,233,59,206,142,179,227,60,223,204,163,61,9,112,139,32,62,127,234,196,65,12,226,121,68,43,166,23,211,139,233,197,244,98,122,49,189,152,110,191,154,253,106,246,171,217,175,102,191,154,253,106,246,171,217,175,102,191,154,253,106,246,171,217,175,102,191,154,253,106,246,171,217,175,182,225,216,184,102,227,154,141,107,54,174,217,184,102,227,218,134,243,252,119,249,45,78,226,34,220,99,151,155,93,110,118,185,217,229,246,116,194,235,124,94,109,183,72,68,38,10,17,68,37,182,71,36,247,36,247,36,247,164,207,61,191,70,238,221,61,37,34,19,133,8,162,18,27,241,153,222,137,157,56,136,147,24,196,69,76,98,61,226,249,185,230,22,252,20,126,10,63,133,159,194,79,225,167,240,83,248,41,252,60,95,200,171,127,165,251,95,109,195,231,50,189,47,243,251,178,188,47,227,125,89,223,151,219,251,178,189,47,251,251,114,127,95,254,159,201,243,125,57,222,151,215,251,114,190,47,215,235,50,189,215,155,222,235,77,239,245,166,247,122,211,123,189,233,189,222,244,94,111,122,175,55,189,215,155,222,235,77,239,245,166,247,122,211,123,189,233,189,222,244,94,111,122,175,55,191,215,155,223,235,205,239,245,230,247,122,243,123,189,249,189,222,252,94,239,93,2,255,249,31,228,69,200,155,220,38,0,0])))