module.exports=JSON.parse(require('zlib').gunzipSync(Buffer.from([31,139,8,0,0,0,0,0,0,19,45,152,91,150,237,170,14,67,59,84,31,139,24,252,104,203,25,183,255,221,184,154,214,254,136,168,149,72,142,3,2,76,253,87,217,127,149,243,87,245,211,117,116,125,186,66,215,213,245,116,165,174,210,37,94,137,215,226,181,120,45,94,139,215,226,181,120,45,94,139,215,226,181,120,35,222,136,55,226,141,120,35,222,136,55,226,141,120,35,222,204,95,255,126,186,142,174,79,87,232,186,186,158,174,212,85,186,90,151,120,71,188,35,222,17,239,136,119,196,59,226,29,241,142,120,71,188,35,222,39,222,39,222,39,222,39,222,39,222,39,222,39,222,39,222,39,222,39,94,136,23,226,133,120,33,94,136,23,226,133,120,33,94,136,23,226,93,241,174,120,87,188,43,222,21,239,138,119,197,187,226,93,241,174,120,79,188,39,222,19,239,137,247,196,123,226,61,241,158,120,79,188,39,94,138,151,226,165,120,41,94,138,151,226,165,120,41,158,198,163,53,30,173,241,104,141,71,107,60,90,227,209,26,143,214,120,180,198,163,53,30,173,241,104,141,199,57,122,137,32,129,2,26,224,129,222,36,56,127,231,234,251,5,9,20,208,128,40,87,157,32,128,162,110,16,4,112,1,20,129,34,80,4,138,64,113,81,92,20,23,197,69,113,81,92,20,23,197,69,113,81,92,20,15,197,67,241,80,60,20,15,5,137,95,18,191,36,126,73,252,146,248,37,241,187,137,39,138,68,145,40,18,69,162,72,20,137,34,81,20,228,130,87,240,10,74,65,161,135,30,239,125,188,247,241,222,199,123,31,239,125,188,247,241,222,199,123,31,239,125,188,247,241,222,148,219,4,251,87,0,23,120,64,2,5,52,32,109,202,118,2,20,31,138,15,197,135,130,190,79,250,62,233,251,164,239,147,190,79,250,62,233,166,162,135,138,30,42,50,45,50,45,50,45,50,45,50,173,183,60,201,138,36,139,36,139,36,139,206,41,58,167,232,18,102,243,97,42,31,230,242,97,50,31,102,243,97,10,29,188,124,48,243,193,205,7,59,31,252,124,48,244,193,209,7,75,31,60,125,48,245,193,213,7,91,31,124,125,48,246,193,217,7,107,31,188,125,48,247,193,221,7,123,31,252,125,48,248,193,225,7,139,31,60,126,48,249,193,229,103,32,15,228,129,60,144,7,242,64,30,200,3,121,150,204,103,141,62,235,251,169,255,4,251,215,8,212,127,130,3,124,64,0,23,120,130,226,105,241,180,120,90,60,173,125,144,0,161,138,80,69,168,134,220,144,27,114,67,110,200,13,185,33,55,188,129,55,240,6,158,150,181,47,180,94,9,30,32,114,36,63,229,201,47,200,32,200,32,200,32,200,32,138,167,164,17,164,17,188,50,120,81,244,254,44,160,1,5,184,90,17,5,146,49,47,191,203,43,175,86,78,65,3,162,60,45,158,2,254,162,55,30,189,129,129,63,12,252,225,201,15,255,125,248,239,75,158,38,125,149,244,80,198,222,83,188,188,60,32,201,36,201,164,115,146,12,146,239,45,153,225,195,147,31,158,252,240,228,135,39,5,5,136,135,39,5,60,224,59,216,6,62,214,228,143,197,234,99,149,250,154,79,109,122,183,233,221,214,174,241,53,253,55,124,229,104,110,9,20,96,100,194,248,105,205,143,159,38,83,28,13,168,224,1,122,160,85,11,8,128,7,119,239,21,208,192,8,30,63,31,63,53,0,2,69,249,148,95,40,65,64,79,63,245,159,64,228,80,6,130,11,60,64,148,171,177,12,22,203,96,177,12,58,86,208,128,20,239,242,147,52,82,131,18,116,98,208,137,130,6,68,73,40,244,169,0,158,58,76,0,143,212,146,212,242,193,35,171,76,120,26,173,96,78,7,51,57,232,73,65,2,5,52,32,5,115,58,152,211,193,174,27,108,187,65,143,7,61,30,236,188,193,214,27,204,183,96,190,5,93,44,216,191,68,25,13,163,224,2,15,72,96,31,52,32,45,83,50,152,146,193,148,12,166,100,48,37,131,41,25,76,201,96,54,10,32,211,197,67,86,67,86,83,240,10,30,249,77,239,95,40,200,111,200,111,200,111,6,217,32,35,191,97,0,134,36,135,1,152,205,148,49,26,141,209,253,201,227,130,3,124,64,0,23,120,64,2,5,52,128,226,160,56,40,14,138,131,226,160,56,40,14,138,131,226,160,56,40,62,20,31,138,15,197,135,226,67,241,161,248,80,124,40,62,20,26,233,123,52,190,23,59,94,236,120,177,227,197,142,23,59,94,236,120,177,227,61,90,64,5,144,31,188,7,239,65,121,80,154,159,234,166,123,6,222,192,211,60,191,31,223,241,241,29,31,223,241,241,29,31,105,124,31,15,130,7,114,157,54,118,5,101,220,222,168,35,4,5,180,32,22,120,32,59,62,6,234,49,80,73,39,38,157,152,191,253,89,252,172,253,121,129,7,36,80,130,230,47,13,89,178,244,37,75,95,178,244,37,75,159,0,197,160,24,120,131,66,227,38,144,226,252,0,217,44,41,78,146,143,214,10,36,25,165,70,178,164,37,165,70,82,86,36,101,69,82,41,36,181,64,82,11,36,181,64,102,1,90,159,179,212,217,130,11,60,32,129,2,26,16,143,141,52,217,67,147,165,42,89,160,146,157,51,89,165,146,85,42,153,101,201,206,153,236,156,201,124,75,166,85,50,173,146,173,50,169,124,147,210,55,169,125,147,226,55,169,126,147,242,55,107,115,209,26,150,163,65,17,236,95,23,144,130,153,146,76,146,100,223,74,102,74,50,83,146,1,72,38,137,64,133,47,174,43,92,87,184,174,112,93,225,186,194,117,133,235,10,215,21,174,171,223,133,119,225,81,148,51,70,197,24,21,99,84,108,94,197,230,85,184,68,16,192,5,30,144,64,1,13,232,189,31,111,251,120,27,187,144,160,0,61,13,66,177,41,9,62,0,10,245,61,123,84,177,71,21,123,84,177,71,21,123,84,5,85,126,80,230,7,117,62,75,105,177,148,22,75,169,0,50,133,190,166,242,95,105,118,2,122,74,5,85,84,80,69,5,85,84,80,197,110,85,84,80,69,5,85,84,80,69,5,85,236,96,197,14,86,84,80,69,5,85,84,80,69,5,85,236,106,197,174,86,44,200,2,20,129,34,80,4,138,64,17,40,232,73,150,230,98,105,22,160,184,40,46,138,139,226,162,184,40,46,138,135,226,161,120,40,30,138,135,130,94,75,122,13,139,54,223,38,224,156,192,65,134,109,91,192,81,129,179,204,229,48,115,57,205,92,142,51,151,243,204,61,123,176,64,193,145,230,114,166,185,28,106,46,167,154,203,177,230,114,174,185,28,108,46,39,155,203,209,230,126,123,22,65,193,233,230,114,188,161,190,111,182,172,102,203,106,234,251,166,190,111,234,251,166,190,239,173,239,181,24,197,226,93,228,220,192,132,2,253,119,46,214,98,47,114,142,216,250,212,5,170,43,84,151,168,174,81,93,164,186,74,61,181,39,144,45,86,93,173,186,92,117,189,234,130,213,21,171,75,214,195,78,7,174,54,87,155,171,205,213,214,106,107,181,181,218,90,109,173,86,211,224,124,65,21,45,60,139,223,98,44,222,69,56,123,92,249,56,175,168,143,216,42,132,189,200,90,154,187,202,226,62,144,197,182,34,23,197,140,221,75,98,119,143,216,173,66,245,222,91,20,39,62,246,161,248,244,94,48,22,125,231,45,46,103,227,124,108,26,66,34,168,168,91,60,139,171,189,171,189,171,221,248,159,227,223,213,222,213,178,157,232,115,191,197,88,188,139,111,49,23,107,177,23,151,191,153,196,102,18,155,73,108,38,177,153,196,102,18,155,73,108,38,177,153,196,102,18,155,9,19,251,110,165,116,183,84,210,162,189,156,187,25,222,205,240,110,134,119,51,228,148,167,227,99,158,69,255,29,139,119,241,45,230,34,252,87,191,197,229,212,114,154,152,111,224,228,63,236,69,248,69,61,32,140,69,248,181,99,84,108,148,66,221,119,105,224,138,96,183,127,205,118,118,178,199,234,10,190,69,223,169,197,94,28,80,142,2,207,226,183,24,139,171,141,213,198,106,99,181,177,218,88,237,219,251,111,239,191,189,255,246,126,110,204,220,152,108,62,137,139,180,173,177,101,246,238,153,189,155,102,31,45,33,224,183,216,139,123,95,223,8,238,211,183,79,53,7,193,187,184,91,76,238,30,195,91,134,127,149,128,223,98,44,222,197,90,100,150,13,165,203,54,215,205,219,38,125,51,125,51,255,221,76,55,229,198,242,157,165,115,118,154,170,177,174,172,43,235,202,186,178,174,172,219,127,91,12,229,205,54,199,205,231,102,163,196,46,21,106,254,253,186,127,196,208,247,109,115,220,124,110,194,205,63,202,115,147,110,202,77,187,153,109,202,81,202,81,202,81,202,81,202,81,202,81,202,81,202,81,202,81,202,81,218,81,218,81,218,81,218,81,218,81,218,81,218,81,218,81,218,81,218,81,198,81,198,81,198,81,198,81,198,81,198,81,198,81,198,81,198,81,102,163,240,47,180,109,142,155,207,77,184,185,110,158,155,116,83,110,218,141,163,28,71,57,142,114,28,229,56,202,113,148,227,40,199,81,142,163,28,71,57,142,242,57,202,231,40,159,163,124,142,242,57,202,231,40,159,163,124,142,242,57,202,231,40,225,40,225,40,225,40,225,40,225,40,225,40,225,40,225,40,225,40,225,40,215,81,174,163,92,71,185,142,114,29,229,58,202,117,148,235,40,215,81,174,163,60,71,121,142,242,28,229,57,202,115,148,231,40,207,81,158,163,60,71,121,142,98,239,182,189,219,246,110,219,187,109,239,182,189,219,246,110,219,187,109,239,182,189,219,246,110,219,187,109,239,182,189,219,246,110,219,187,109,239,182,189,219,246,110,219,187,109,239,182,189,219,246,110,219,187,109,239,182,189,219,246,110,219,187,109,239,182,189,219,246,110,219,187,109,239,182,189,219,246,110,219,187,109,239,182,189,219,246,110,219,187,99,239,142,189,59,246,238,216,187,99,239,142,189,59,246,238,216,187,99,239,142,189,59,246,238,216,187,99,239,142,189,59,246,238,216,187,99,239,142,189,59,246,238,216,187,99,239,142,189,59,246,238,216,187,99,239,142,189,59,246,238,216,187,99,239,142,189,59,246,238,216,187,99,239,142,189,59,246,238,216,187,99,239,142,189,59,246,238,216,187,99,239,142,189,59,246,238,216,187,99,239,142,189,59,246,238,216,187,99,239,142,189,59,246,238,216,187,99,239,142,189,59,246,238,216,187,99,239,142,189,59,246,238,216,187,99,239,142,189,59,246,238,216,187,99,239,142,189,59,246,238,216,187,99,239,142,189,59,246,238,216,187,99,239,142,189,59,246,238,216,187,99,239,142,189,59,246,238,216,187,99,239,142,189,59,246,238,216,187,99,239,142,189,59,246,238,216,187,99,239,142,189,59,246,238,216,187,99,239,142,189,59,246,238,216,187,99,239,142,189,59,246,238,204,252,239,255,72,102,243,20,57,25,0,0])))