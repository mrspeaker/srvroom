*server*
npm start

*client*
cd client
budo

(Budo, or whatever server you use for serving files. Client needs to be served with budo because Game code is shared via symlink that doesn't work from file://)
